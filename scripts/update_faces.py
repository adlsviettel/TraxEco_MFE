import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Swap Face labels:
# A was at Z=W/2, now B is there
# B was at X=L/2, now A is there
# C was at Z=-W/2, now D is there
# D was at X=-L/2, now C is there

content = content.replace(
    '<Text position={[0, 0, W/2 + 0.01]} rotation={[0, 0, 0]} fontSize={Math.min(L, H) * 0.4} color="#a68453" fillOpacity={0.6}>A</Text>',
    '<Text position={[0, 0, W/2 + 0.01]} rotation={[0, 0, 0]} fontSize={Math.min(L, H) * 0.4} color="#a68453" fillOpacity={0.6}>B</Text>'
)
content = content.replace(
    '<Text position={[L/2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#a68453" fillOpacity={0.6}>B</Text>',
    '<Text position={[L/2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#a68453" fillOpacity={0.6}>A</Text>'
)
content = content.replace(
    '<Text position={[0, 0, -W/2 - 0.01]} rotation={[0, Math.PI, 0]} fontSize={Math.min(L, H) * 0.4} color="#a68453" fillOpacity={0.6}>C</Text>',
    '<Text position={[0, 0, -W/2 - 0.01]} rotation={[0, Math.PI, 0]} fontSize={Math.min(L, H) * 0.4} color="#a68453" fillOpacity={0.6}>D</Text>'
)
content = content.replace(
    '<Text position={[-L/2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#a68453" fillOpacity={0.6}>D</Text>',
    '<Text position={[-L/2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#a68453" fillOpacity={0.6}>C</Text>'
)

# Swap mark.area logic
logic_old = '''        if (mark.area === 'A') {
          // Front face (Z = W/2)
          position.set(-L/2 + pX + labelW/2, -H/2 + pY + labelH/2, W/2);
          rotation.set(0, 0, 0);
        } else if (mark.area === 'B') {
          // Right face (X = L/2)
          position.set(L/2, -H/2 + pY + labelH/2, W/2 - pX - labelW/2);
          rotation.set(0, Math.PI / 2, 0);
        } else if (mark.area === 'C') {
          // Back face (Z = -W/2)
          position.set(L/2 - pX - labelW/2, -H/2 + pY + labelH/2, -W/2);
          rotation.set(0, Math.PI, 0);
        } else if (mark.area === 'D') {
          // Left face (X = -L/2)
          position.set(-L/2, -H/2 + pY + labelH/2, -W/2 + pX + labelW/2);
          rotation.set(0, -Math.PI / 2, 0);'''

logic_new = '''        if (mark.area === 'B') {
          // Front face (Z = W/2)
          position.set(-L/2 + pX + labelW/2, -H/2 + pY + labelH/2, W/2);
          rotation.set(0, 0, 0);
        } else if (mark.area === 'A') {
          // Right face (X = L/2)
          position.set(L/2, -H/2 + pY + labelH/2, W/2 - pX - labelW/2);
          rotation.set(0, Math.PI / 2, 0);
        } else if (mark.area === 'D') {
          // Back face (Z = -W/2)
          position.set(L/2 - pX - labelW/2, -H/2 + pY + labelH/2, -W/2);
          rotation.set(0, Math.PI, 0);
        } else if (mark.area === 'C') {
          // Left face (X = -L/2)
          position.set(-L/2, -H/2 + pY + labelH/2, -W/2 + pX + labelW/2);
          rotation.set(0, -Math.PI / 2, 0);'''

content = content.replace(logic_old, logic_new)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
