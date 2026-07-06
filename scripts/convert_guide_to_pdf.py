import os
import sys
import subprocess
import re

# Ensure markdown library is installed
try:
    import markdown
except ImportError:
    print("Installing markdown package...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown"])
    import markdown

script_dir = os.path.dirname(os.path.abspath(__file__))

def clean_html(html_str):
    # strip leading and trailing whitespace from each line to prevent markdown from converting indented HTML into pre/code blocks
    return "\n".join(line.strip() for line in html_str.split("\n"))

def get_svg_flowchart(lang):
    if lang == "vi":
        svg_content = """
        <div style="page-break-inside: avoid; text-align: center; margin: 32px 0;">
        <svg width="100%" height="240" viewBox="0 0 800 240" style="display: block; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <defs>
            <!-- Shadow Filter for Nodes -->
            <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.05" />
            </filter>
            
            <!-- Markers for arrows -->
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
            <marker id="red-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
            <marker id="blue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
            </marker>
          </defs>

          <!-- Node 1: ĐĂNG KÝ MỚI -->
          <rect x="15" y="45" width="110" height="52" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="70" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#334155" text-anchor="middle">ĐĂNG KÝ MỚI</text>
          <text x="70" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#94a3b8" text-anchor="middle">(Not Started)</text>

          <!-- Connection 1 -> 2 -->
          <path d="M 125 71 L 157 71" stroke="#475569" stroke-width="1.5" fill="none" marker-end="url(#arrow)" />

          <!-- Node 2: NHẬN VẬT TƯ -->
          <rect x="165" y="45" width="110" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="220" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#1e40af" text-anchor="middle">NHẬN VẬT TƯ</text>
          <text x="220" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#3b82f6" text-anchor="middle">(In Progress)</text>

          <!-- Connection 2 -> 3 -->
          <path d="M 275 71 L 307 71" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#blue-arrow)" />

          <!-- Node 3: THIẾT KẾ RẬP -->
          <rect x="315" y="45" width="110" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="370" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#1e40af" text-anchor="middle">THIẾT KẾ RẬP</text>
          <text x="370" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#3b82f6" text-anchor="middle">(In Progress)</text>

          <!-- Connection 3 -> 4 -->
          <path d="M 425 71 L 457 71" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#blue-arrow)" />

          <!-- Node 4: HOÀN THÀNH -->
          <rect x="465" y="45" width="110" height="52" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="520" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#065f46" text-anchor="middle">HOÀN THÀNH</text>
          <text x="520" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#10b981" text-anchor="middle">(Finished)</text>

          <!-- Connection 4 -> 5 -->
          <path d="M 575 71 L 607 71" stroke="#10b981" stroke-width="1.5" fill="none" marker-end="url(#arrow)" />

          <!-- Node 5: BÀN GIAO XƯỞNG -->
          <rect x="615" y="45" width="115" height="52" rx="6" fill="#f0fdf4" stroke="#15803d" stroke-width="2" filter="url(#node-shadow)" />
          <text x="672.5" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#14532d" text-anchor="middle">BÀN GIAO XƯỞNG</text>
          <text x="672.5" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#15803d" text-anchor="middle">(Released)</text>

          <!-- Node 6 (Remake) -->
          <rect x="315" y="150" width="110" height="52" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="370" y="173" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#991b1b" text-anchor="middle">LÀM LẠI RẬP</text>
          <text x="370" y="188" font-family="'Times New Roman', Times, serif" font-size="10" fill="#ef4444" text-anchor="middle">(Remake)</text>

          <!-- Connection 3 -> 6 (Down) -->
          <path d="M 370 97 L 370 142" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3" fill="none" marker-end="url(#red-arrow)" />
          <text x="378" y="123" font-family="'Times New Roman', Times, serif" font-size="9.5" font-weight="bold" fill="#ef4444">Lỗi / Làm lại</text>

          <!-- Connection 6 -> 3 (Up Left Return Loop) -->
          <path d="M 315 176 C 275 176, 275 71, 307 71" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#red-arrow)" />
          <text x="242" y="130" font-family="'Times New Roman', Times, serif" font-size="9.5" font-weight="bold" fill="#ef4444">Thiết kế lại</text>
        </svg>
        <p style="font-size: 12px; font-family: 'Times New Roman', Times, serif; color: #64748b; margin-top: 6px; font-style: italic;">Sơ đồ 1.1: Quy trình vòng đời trạng thái của một yêu cầu phát triển rập</p>
        </div>
        """
    else:
        svg_content = """
        <div style="page-break-inside: avoid; text-align: center; margin: 32px 0;">
        <svg width="100%" height="240" viewBox="0 0 800 240" style="display: block; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <defs>
            <!-- Shadow Filter for Nodes -->
            <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.05" />
            </filter>
            
            <!-- Markers for arrows -->
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
            <marker id="red-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
            <marker id="blue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
            </marker>
          </defs>

          <!-- Node 1: NEW REQUEST -->
          <rect x="15" y="45" width="110" height="52" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="70" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#334155" text-anchor="middle">NEW REQUEST</text>
          <text x="70" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#94a3b8" text-anchor="middle">(Not Started)</text>

          <!-- Connection 1 -> 2 -->
          <path d="M 125 71 L 157 71" stroke="#475569" stroke-width="1.5" fill="none" marker-end="url(#arrow)" />

          <!-- Node 2: RECEIVE MATERIAL -->
          <rect x="165" y="45" width="110" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="220" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#1e40af" text-anchor="middle">RECEIVE MATERIAL</text>
          <text x="220" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#3b82f6" text-anchor="middle">(In Progress)</text>

          <!-- Connection 2 -> 3 -->
          <path d="M 275 71 L 307 71" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#blue-arrow)" />

          <!-- Node 3: PATTERN DESIGN -->
          <rect x="315" y="45" width="110" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="370" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#1e40af" text-anchor="middle">PATTERN DESIGN</text>
          <text x="370" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#3b82f6" text-anchor="middle">(In Progress)</text>

          <!-- Connection 3 -> 4 -->
          <path d="M 425 71 L 457 71" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#blue-arrow)" />

          <!-- Node 4: FINISHED -->
          <rect x="465" y="45" width="110" height="52" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="520" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#065f46" text-anchor="middle">FINISHED</text>
          <text x="520" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#10b981" text-anchor="middle">(Finished)</text>

          <!-- Connection 4 -> 5 -->
          <path d="M 575 71 L 607 71" stroke="#10b981" stroke-width="1.5" fill="none" marker-end="url(#arrow)" />

          <!-- Node 5: RELEASE TO FACTORY -->
          <rect x="615" y="45" width="115" height="52" rx="6" fill="#f0fdf4" stroke="#15803d" stroke-width="2" filter="url(#node-shadow)" />
          <text x="672.5" y="68" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#14532d" text-anchor="middle">RELEASE TO FACTORY</text>
          <text x="672.5" y="83" font-family="'Times New Roman', Times, serif" font-size="10" fill="#15803d" text-anchor="middle">(Released)</text>

          <!-- Node 6 (Remake) -->
          <rect x="315" y="150" width="110" height="52" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5" filter="url(#node-shadow)" />
          <text x="370" y="173" font-family="'Times New Roman', Times, serif" font-size="11.5" font-weight="bold" fill="#991b1b" text-anchor="middle">REMAKE PATTERN</text>
          <text x="370" y="188" font-family="'Times New Roman', Times, serif" font-size="10" fill="#ef4444" text-anchor="middle">(Remake)</text>

          <!-- Connection 3 -> 6 (Down) -->
          <path d="M 370 97 L 370 142" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3" fill="none" marker-end="url(#red-arrow)" />
          <text x="378" y="123" font-family="'Times New Roman', Times, serif" font-size="9.5" font-weight="bold" fill="#ef4444">Error / Remake</text>

          <!-- Connection 6 -> 3 (Up Left Return Loop) -->
          <path d="M 315 176 C 275 176, 275 71, 307 71" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#red-arrow)" />
          <text x="242" y="130" font-family="'Times New Roman', Times, serif" font-size="9.5" font-weight="bold" fill="#ef4444">Redesign</text>
        </svg>
        <p style="font-size: 12px; font-family: 'Times New Roman', Times, serif; color: #64748b; margin-top: 6px; font-style: italic;">Diagram 1.1: State lifecycle workflow of a pattern development request</p>
        </div>
        """
    return clean_html(svg_content)

def convert_document(lang):
    print(f"--- Converting {lang.upper()} document ---")
    md_filename = f"user_guide_tcc_template_{lang}.md"
    html_filename = f"user_guide_tcc_template_{lang}.html"
    pdf_filename = f"user_guide_tcc_template_{lang}.pdf"
    
    md_path = os.path.join(script_dir, md_filename)
    html_path = os.path.join(script_dir, html_filename)
    pdf_path = os.path.join(script_dir, pdf_filename)
    
    if not os.path.exists(md_path):
        print(f"ERROR: Markdown file {md_path} does not exist!")
        return False
        
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()
        
    lines = text.split("\n")
    processed_lines = []
    in_quote = False
    quote_type = None
    quote_lines = []
    
    skip_header = True
    
    for line in lines:
        stripped = line.strip()
        
        # Skip the raw header logo and title in the markdown body since we build a custom styled cover page in HTML
        if skip_header:
            if stripped.startswith("# ") or stripped.startswith("## ") or stripped.startswith("![") or "TRAXECO GROUP" in stripped or "Version" in stripped or "Phiên bản" in stripped:
                continue
            if stripped == "---":
                skip_header = False
                continue
            if stripped == "":
                continue
        
        # Alert Box matching: > [!NOTE], > [!IMPORTANT], > [!TIP]
        if stripped.startswith(">"):
            in_quote = True
            content = stripped[1:].strip()
            if content.startswith("[!IMPORTANT]"):
                quote_type = "important"
                content = content.replace("[!IMPORTANT]", "").strip()
            elif content.startswith("[!NOTE]"):
                quote_type = "note"
                content = content.replace("[!NOTE]", "").strip()
            elif content.startswith("[!TIP]"):
                quote_type = "tip"
                content = content.replace("[!TIP]", "").strip()
            
            if content:
                quote_lines.append(content)
            continue
        else:
            if in_quote:
                alert_class = quote_type or "note"
                if lang == "vi":
                    alert_title = "LƯU Ý QUAN TRỌNG" if alert_class == "important" else ("MẸO HỮU ÍCH" if alert_class == "tip" else "THÔNG TIN HƯỚNG DẪN")
                else:
                    alert_title = "IMPORTANT NOTE" if alert_class == "important" else ("HELPFUL TIP" if alert_class == "tip" else "GUIDELINE INFO")
                    
                alert_color = "#b91c1c" if alert_class == "important" else ("#15803d" if alert_class == "tip" else "#1d4ed8")
                alert_bg = "#fef2f2" if alert_class == "important" else ("#ecfdf5" if alert_class == "tip" else "#eff6ff")
                alert_icon = "⚠️" if alert_class == "important" else ("💡" if alert_class == "tip" else "ℹ️")
                
                inner_html = " ".join(quote_lines)
                inner_html_compiled = markdown.markdown(inner_html).replace("<p>", "").replace("</p>", "")
                
                alert_html = f"""
                <div style="border-left: 5px solid {alert_color}; background-color: {alert_bg}; padding: 16px 20px; margin: 24px 0; border-radius: 6px; font-size: 14.5px; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.02); page-break-inside: avoid;">
                    <span style="color: {alert_color}; font-weight: bold; font-size: 13.5px; letter-spacing: 0.2px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 15px;">{alert_icon}</span> {alert_title}
                    </span>
                    {inner_html_compiled}
                </div>
                """
                processed_lines.append(clean_html(alert_html))
                in_quote = False
                quote_type = None
                quote_lines = []
                
        # Numbered list step matching: e.g. "1. **Truy cập trang Tra cứu**: ..."
        step_match_bold = re.match(r"^(\d+)\.\s+\*\*(.*?)\*\*(.*)$", stripped)
        step_match_normal = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        
        if step_match_bold:
            num = step_match_bold.group(1)
            title = step_match_bold.group(2)
            rest = step_match_bold.group(3)
            rest_cleaned = markdown.markdown(rest).replace("<p>", "").replace("</p>", "")
            step_html = f'<div style="display: flex; align-items: flex-start; gap: 16px; margin: 18px 0; padding: 4px 6px; border-radius: 4px;"><div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; box-shadow: 0 3px 6px rgba(22, 163, 74, 0.2);">{num}</div><div style="flex: 1; font-size: 15px; color: #1e293b; line-height: 1.6; padding-top: 2px;"><strong style="color: #0f172a; font-weight: bold; font-size: 15.5px;">{title}</strong>{rest_cleaned}</div></div>'
            processed_lines.append(step_html)
        elif step_match_normal:
            num = step_match_normal.group(1)
            content = step_match_normal.group(2)
            content_cleaned = markdown.markdown(content).replace("<p>", "").replace("</p>", "")
            step_html = f'<div style="display: flex; align-items: flex-start; gap: 16px; margin: 18px 0; padding: 4px 6px; border-radius: 4px;"><div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; box-shadow: 0 3px 6px rgba(22, 163, 74, 0.2);">{num}</div><div style="flex: 1; font-size: 15px; color: #1e293b; line-height: 1.6; padding-top: 2px;">{content_cleaned}</div></div>'
            processed_lines.append(step_html)
        else:
            processed_lines.append(line)
            
    if in_quote:
        alert_class = quote_type or "note"
        if lang == "vi":
            alert_title = "LƯU Ý QUAN TRỌNG" if alert_class == "important" else ("MẸO HỮU ÍCH" if alert_class == "tip" else "THÔNG TIN HƯỚNG DẪN")
        else:
            alert_title = "IMPORTANT NOTE" if alert_class == "important" else ("HELPFUL TIP" if alert_class == "tip" else "GUIDELINE INFO")
            
        alert_color = "#b91c1c" if alert_class == "important" else ("#15803d" if alert_class == "tip" else "#1d4ed8")
        alert_bg = "#fef2f2" if alert_class == "important" else ("#ecfdf5" if alert_class == "tip" else "#eff6ff")
        alert_icon = "⚠️" if alert_class == "important" else ("💡" if alert_class == "tip" else "ℹ️")
        
        inner_html = " ".join(quote_lines)
        inner_html_compiled = markdown.markdown(inner_html).replace("<p>", "").replace("</p>", "")
        
        alert_html = f"""
        <div style="border-left: 5px solid {alert_color}; background-color: {alert_bg}; padding: 16px 20px; margin: 24px 0; border-radius: 6px; font-size: 14.5px; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.02); page-break-inside: avoid;">
            <span style="color: {alert_color}; font-weight: bold; font-size: 13.5px; letter-spacing: 0.2px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 15px;">{alert_icon}</span> {alert_title}
            </span>
            {inner_html_compiled}
        </div>
        """
        processed_lines.append(clean_html(alert_html))
        
    processed_text = "\n".join(processed_lines)
    
    # Replace the mermaid code blocks with the clean inline SVG flowchart
    processed_text = re.sub(r"```mermaid.*?```", get_svg_flowchart(lang), processed_text, flags=re.DOTALL)
    
    # Convert markdown to HTML body
    html_body = markdown.markdown(processed_text, extensions=['tables'])
    
    # Select cover page text based on language
    if lang == "vi":
        cover_title = "TÀI LIỆU HƯỚNG DẪN SỬ DỤNG<br>(USER GUIDE)"
        cover_subtitle = "Hệ thống Quản lý Yêu cầu Phát triển Rập<br>(TCC Template Request)"
        cover_footer = """
            <strong>TRAXECO GROUP — TCC TEMPLATE DIVISION</strong><br>
            Cổng thông tin & Quy trình vận hành chi tiết step-by-step<br>
            Phiên bản: 1.4.0 | Ngày cập nhật: 2026-06-20
        """
    else:
        cover_title = "USER GUIDE"
        cover_subtitle = "Pattern Development Request Management System<br>(TCC Template Request)"
        cover_footer = """
            <strong>TRAXECO GROUP — TCC TEMPLATE DIVISION</strong><br>
            Portal & Step-by-step Operational Procedures<br>
            Version: 1.4.0 | Updated: 2026-06-20
        """
        
    # Styles and page wrappers
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TCC Template Request - User Guide ({lang.upper()})</title>
    <style>
        @page {{
            size: A4;
            margin: 20mm;
        }}
        body {{
            font-family: 'Times New Roman', Times, serif;
            color: #1e293b;
            line-height: 1.65;
            font-size: 15.5px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        
        /* Cover Page Styling */
        .cover-page {{
            text-align: center;
            height: 960px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            page-break-after: always;
            box-sizing: border-box;
            background: radial-gradient(circle at 10% 20%, rgba(240, 253, 244, 0.4) 0%, rgba(255, 255, 255, 1) 90%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 80px 40px;
            margin: -10px;
            position: relative;
            overflow: hidden;
        }}
        .cover-page > div {{
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }}
        
        .cover-logo {{
            height: 230px;
            margin-bottom: 20px;
            position: relative;
            z-index: 2;
        }}
        .cover-title {{
            font-size: 28px;
            color: #15803d;
            font-weight: bold;
            margin-top: 60px;
            margin-bottom: 16px;
            line-height: 1.25;
            position: relative;
            z-index: 2;
        }}
        .cover-subtitle {{
            font-size: 21px;
            color: #334155;
            font-weight: normal;
            margin-bottom: 80px;
            position: relative;
            z-index: 2;
        }}
        .cover-divider {{
            width: 140px;
            height: 4px;
            background: linear-gradient(90deg, #16a34a 0%, #15803d 100%);
            margin: 0 auto 50px auto;
            border-radius: 2px;
            position: relative;
            z-index: 2;
        }}
        .cover-meta {{
            font-size: 14.5px;
            color: #475569;
            line-height: 1.8;
            margin-top: 280px;
            border-top: 1px solid #cbd5e1;
            padding-top: 30px;
            position: relative;
            z-index: 2;
        }}
        
        /* Table of Contents (TOC) Styling */
        .toc-page-wrapper {{
            height: 900px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            width: 100%;
        }}
        .toc-container {{
            width: 100%;
            max-width: 680px;
            margin: 0 auto;
            padding: 20px 40px;
            background-color: transparent;
            border: none;
            box-shadow: none;
            page-break-inside: avoid;
        }}
        .toc-container h2 {{
            text-align: center;
            color: #15803d;
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: bold;
            page-break-before: avoid;
        }}
        .toc-line {{
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, #16a34a 0%, #15803d 100%);
            margin: 0 auto 36px auto;
            border-radius: 2px;
        }}
        .toc-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .toc-list li {{
            margin-bottom: 16px;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            color: #1e293b;
        }}
        .toc-list li a {{
            color: #1e293b;
            text-decoration: none;
            font-weight: bold;
        }}
        .toc-list li:not(.toc-subitem)::after {{
            content: '';
            flex-grow: 1;
            border-bottom: 1.5px dotted #94a3b8;
            margin: 0 12px;
            position: relative;
            top: -4px;
        }}
        .toc-list .toc-subitem {{
            margin-left: 24px;
            margin-top: -6px;
            margin-bottom: 12px;
            font-size: 14.5px;
            display: block;
        }}
        .toc-list .toc-subitem a {{
            color: #475569;
            font-weight: normal;
        }}
        .toc-page {{
            font-weight: bold;
            color: #475569;
            min-width: 60px;
            text-align: right;
        }}
        
        /* Headings */
        h1 {{
            color: #0f172a;
            font-size: 21px;
            margin-top: 48px;
            margin-bottom: 24px;
            font-weight: bold;
            position: relative;
            page-break-inside: avoid;
        }}
        h1::after {{
            content: '';
            display: block;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #16a34a 0%, #15803d 100%);
            border-radius: 2px;
            margin-top: 8px;
        }}
        h2 {{
            color: #15803d;
            font-size: 18px;
            margin-top: 36px;
            margin-bottom: 18px;
            font-weight: bold;
            page-break-inside: avoid;
        }}
        h3 {{
            color: #166534;
            font-size: 16px;
            margin-top: 28px;
            margin-bottom: 12px;
            font-weight: bold;
            page-break-inside: avoid;
        }}
        
        /* Tables */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 28px 0;
            font-size: 14.5px;
            box-shadow: 0 2px 8 rgba(0,0,0,0.01);
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            page-break-inside: avoid;
        }}
        th {{
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            font-weight: bold;
            text-align: left;
            padding: 12px 14px;
            border: 1px solid rgba(0,0,0,0.03);
            font-size: 14.5px;
        }}
        td {{
            padding: 11px 14px;
            border: 1px solid #cbd5e1;
            color: #334155;
            line-height: 1.5;
        }}
        tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        
        /* Lists */
        ul, ol {{
            margin-bottom: 20px;
            padding-left: 24px;
        }}
        li {{
            margin-bottom: 8px;
            color: #334155;
        }}
        
        /* Code blocks */
        code {{
            font-family: 'Consolas', 'Courier New', monospace;
            background-color: #f1f5f9;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 13.5px;
            color: #0f172a;
            font-weight: bold;
        }}
        pre {{
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 24px 0;
            page-break-inside: avoid;
        }}
        pre code {{
            background-color: transparent;
            padding: 0;
            color: #334155;
            font-weight: normal;
        }}
        
        /* Divider */
        hr {{
            border: 0;
            height: 1px;
            background: linear-gradient(90deg, rgba(203, 213, 225, 0.2) 0%, rgba(203, 213, 225, 1) 50%, rgba(203, 213, 225, 0.2) 100%);
            margin: 36px 0;
        }}
        
        /* Image alignment cards */
        .image-container {{
            page-break-inside: avoid;
            break-inside: avoid;
        }}
        
        /* Page break class */
        .page-break {{
            page-break-before: always;
            break-before: page;
        }}
    </style>
</head>
<body>
    <!-- COVER PAGE -->
    <div class="cover-page">
        <div>
            <img src="user_guide_images/logo.png" alt="Logo" class="cover-logo" />
            <div class="cover-title">{cover_title}</div>
            <div class="cover-subtitle">{cover_subtitle}</div>
            <div class="cover-divider"></div>
        </div>
        <div class="cover-meta">
            {cover_footer}
        </div>
    </div>
    
    <!-- MAIN CONTENT -->
    {html_body}
</body>
</html>
"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML file created at: {html_path}")
    
    # Compile HTML to PDF using Headless Chrome or Edge
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]
    chrome_path = None
    for p in chrome_paths:
        if os.path.exists(p):
            chrome_path = p
            break
            
    if chrome_path:
        try:
            print(f"Running Headless Chrome to compile {pdf_filename}...")
            cmd = [
                chrome_path,
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                "--print-to-pdf-no-header",
                f"--print-to-pdf={pdf_path}",
                html_path
            ]
            subprocess.check_call(cmd)
            print(f"SUCCESS: Modern PDF {pdf_filename} generated successfully using Headless Chrome!")
            return True
        except Exception as e:
            print(f"Chrome conversion failed: {e}")
            
    # Try Edge if Chrome is not found or fails
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_path = None
    for p in edge_paths:
        if os.path.exists(p):
            edge_path = p
            break
            
    if edge_path:
        try:
            print(f"Running Headless Edge to compile {pdf_filename}...")
            cmd = [
                edge_path,
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_path}",
                html_path
            ]
            subprocess.check_call(cmd)
            print(f"SUCCESS: Modern PDF {pdf_filename} generated successfully using Headless Edge!")
            return True
        except Exception as e:
            print(f"Edge conversion failed: {e}")
            
    print("FAILED both Chrome and Edge conversion to PDF.")
    return False

if __name__ == "__main__":
    convert_document("vi")
    convert_document("en")
