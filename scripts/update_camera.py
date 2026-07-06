import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add maxDim before Canvas
canvas_new = '''  const maxDim = Math.max(props.length || 500, props.width || 400, props.height || 300) * 0.01;
  
  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', cursor: 'grab' }}>
      <Canvas shadows camera={{ position: [0, 0, maxDim * 2.5], fov: 50 }}>'''

content = re.sub(r'  return \(\n    <div style=\{\{ width: \'100%\', height: \'400px\'.*?\n      <Canvas shadows camera=\{\{ position: \[.*?\], fov: 50 \}\}>', canvas_new, content, flags=re.DOTALL)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
