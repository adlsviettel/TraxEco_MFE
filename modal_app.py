import os
from modal import App, Image, fastapi_endpoint, enter
from fastapi import Request

# 1. Define the container image with all dependencies
image = (
    Image.debian_slim(python_version="3.10")
    .pip_install(
        "torch",
        "transformers",
        "accelerate",
        "pillow",
        "fastapi[standard]",
        "python-multipart",
        "qwen-vl-utils",
        "torchvision"
    )
)

# Initialize the Modal App
app = App("qwen-vision-api", image=image)

# Cache model weights during build to prevent download overhead during startup
model_id = "Qwen/Qwen2-VL-7B-Instruct"  # 7B model is much more accurate for rotated/low-contrast text

@app.cls(
    gpu="A10G",  # Use A10G GPU for the 7B model
    max_containers=5,
    timeout=600
)
class QwenModel:
    def __build__(self):
        # Trigger huggingface download to bake model weights into the container image
        from transformers import AutoProcessor, AutoModelForVision2Seq
        print("Downloading processor and model weights...")
        AutoProcessor.from_pretrained(model_id)
        AutoModelForVision2Seq.from_pretrained(model_id, device_map="cpu")
        print("Model downloaded successfully!")

    @enter()
    def __enter__(self):
        import torch
        from transformers import AutoProcessor, AutoModelForVision2Seq
        
        print("Loading model into GPU VRAM...")
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForVision2Seq.from_pretrained(
            model_id, 
            torch_dtype=torch.bfloat16, 
            device_map="cuda"
        )
        print("Model loaded successfully!")

    @fastapi_endpoint(method="POST")
    async def extract(self, request: Request, itemType: str):
        import torch
        from PIL import Image as PILImage
        import io
        import json
        from qwen_vl_utils import process_vision_info
        
        try:
            # 1. Load image from request body
            file_bytes = await request.body()
            image = PILImage.open(io.BytesIO(file_bytes)).convert("RGB")
            
            # 2. Define the system/user prompts based on itemType
            schema_instructions = ""
            if itemType == "FABRIC":
                schema_instructions = """
                Extract the following fabric details and output ONLY a valid JSON object matching this schema:
                {
                  "itemCode": "string (the product code, article number, or reference number, e.g., 3PF-P1198-1)",
                  "supplierName": "string (e.g. Shinkong Textile)",
                  "origin": "string (e.g. Taiwan, Vietnam, China)",
                  "composition": "string (strictly categorize as Synthetic, Natural, or Natural blend)",
                  "compositionDetail": "string (composition details, e.g. Polyester 100%, Cotton 80% Polyester 20%)",
                  "weightGsm": "string (weight in GSM, numeric string, e.g., 63)",
                  "cuttableWidth": "string (width, e.g. 57/58)",
                  "colorName": "string (e.g. White, Navy)",
                  "structure": "string (strictly categorize as Woven or Knit)",
                  "fabricName": "string (fabric name/type, e.g. Solar Cool Shine)",
                  "function": "string (features/functions, e.g. Stretch, Quick dry, Air permeable)",
                  "description": "string (any fabric construction detail, weave info or specifications)",
                  "remark": "string (any extra notes or details found)"
                }
                """
            else:
                schema_instructions = """
                Extract the following accessory/trim details and output ONLY a valid JSON object matching this schema:
                {
                  "itemCode": "string (the item code or reference code)",
                  "supplierName": "string (supplier name)",
                  "origin": "string (country of origin)",
                  "composition": "string (strictly categorize as Synthetic, Natural, or Natural blend)",
                  "specification": "string (accessory specifications)",
                  "size": "string (size, dimensions, or size range)",
                  "colorName": "string (color name)",
                  "description": "string (accessory description)",
                  "remark": "string (any extra notes or details found)"
                }
                """
            
            prompt = f"""
            You are an expert AI OCR assistant. Analyze the uploaded fabric/accessory sticker image.
            {schema_instructions}
            
            Strictly return ONLY the raw JSON block without markdown formatting or wrapping.
            If a field is not found in the sticker, set its value to null.
            """
            
            # 3. Formulate input messages for Qwen2-VL
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": prompt},
                    ],
                }
            ]
            
            # 4. Prepare inputs
            text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            image_inputs, video_inputs = process_vision_info(messages)
            inputs = self.processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            )
            inputs = inputs.to("cuda")
            
            # 5. Generate outputs
            generated_ids = self.model.generate(**inputs, max_new_tokens=512)
            generated_ids_trimmed = [
                out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            output_text = self.processor.batch_decode(
                generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )[0]
            
            print(f"--- QWEN MODEL RAW OUTPUT ---")
            print(output_text)
            print(f"-----------------------------")
            
            # 6. Parse JSON safely and return
            cleaned_text = output_text.strip()
            if cleaned_text.startswith("```"):
                # strip markdown code blocks if the model generated them
                lines = cleaned_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
            
            if cleaned_text.startswith("json"):
                cleaned_text = cleaned_text[4:].strip()
            
            result = json.loads(cleaned_text)
            print(f"Parsed JSON Result: {result}")
            return result
            
        except Exception as e:
            print(f"Error during extraction: {e}")
            return {"error": f"Failed to extract sticker details: {str(e)}"}
