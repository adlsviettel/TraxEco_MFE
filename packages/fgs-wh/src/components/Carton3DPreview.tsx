import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Decal, Text } from '@react-three/drei';
import * as THREE from 'three';

interface MarkInfo {
  shippingMarkId: number;
  area: string;
  posX: number;
  posY: number;
  shippingMarkPicture?: string;
}

interface Carton3DPreviewProps {
  length: number; // CTNL in mm
  width: number;  // CTNW in mm
  height: number; // CTNH in mm
  marks: MarkInfo[];
}

const CARTON_COLOR = '#d4b483';

const CartonMesh = ({ length, width, height, marks }: Carton3DPreviewProps) => {
  // Scale down to fit in view (e.g. 500mm -> 5 units)
  const scale = 0.01;
  const L = (length || 500) * scale;
  const W = (width || 400) * scale;
  const H = (height || 300) * scale;

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[L, H, W]} />
      <meshStandardMaterial color={CARTON_COLOR} roughness={0.9} />
      
      {/* Face Labels */}
      <Text position={[0, 0, W/2 + 0.01]} rotation={[0, 0, 0]} fontSize={Math.min(L, H) * 0.4} color="#000000" fillOpacity={0.9}>B</Text>
      <Text position={[L/2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#000000" fillOpacity={0.9}>D</Text>
      <Text position={[0, 0, -W/2 - 0.01]} rotation={[0, Math.PI, 0]} fontSize={Math.min(L, H) * 0.4} color="#000000" fillOpacity={0.9}>A</Text>
      <Text position={[-L/2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={Math.min(W, H) * 0.4} color="#000000" fillOpacity={0.9}>C</Text>
      <Text position={[0, H/2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={Math.min(L, W) * 0.4} color="#000000" fillOpacity={0.9}>E</Text>
      <Text position={[0, -H/2 - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={Math.min(L, W) * 0.4} color="#000000" fillOpacity={0.9}>F</Text>

      {marks.map((mark, idx) => {
        // Label dimensions based on shippingMarkId
        let labelW = 100 * scale; 
        let labelH = 60 * scale;
        
        if (mark.shippingMarkId === 26) {
          labelW = 216 * scale;
          labelH = 30 * scale;
        } else if (mark.shippingMarkId === 27) {
          labelW = 90 * scale;
          labelH = 80 * scale;
        }

        let position = new THREE.Vector3();
        let rotation = new THREE.Euler();

        const pX = mark.posX * scale;
        const pY = mark.posY * scale;

        // Map area to 3D faces (B: Front, A: Back, D: Right, C: Left, E: Top, F: Bottom)
        if (mark.area === 'B') {
          // Front face (Z = W/2)
          position.set(-L/2 + pX + labelW/2, -H/2 + pY + labelH/2, W/2);
          rotation.set(0, 0, 0);
        } else if (mark.area === 'A') {
          // Back face (Z = -W/2)
          position.set(L/2 - pX - labelW/2, -H/2 + pY + labelH/2, -W/2);
          rotation.set(0, Math.PI, 0);
        } else if (mark.area === 'D') {
          // Right face (X = L/2)
          position.set(L/2, -H/2 + pY + labelH/2, W/2 - pX - labelW/2);
          rotation.set(0, Math.PI / 2, 0);
        } else if (mark.area === 'C') {
          // Left face (X = -L/2)
          position.set(-L/2, -H/2 + pY + labelH/2, -W/2 + pX + labelW/2);
          rotation.set(0, -Math.PI / 2, 0);
        } else if (mark.area === 'E') {
          // Top face (Y = H/2)
          position.set(-L/2 + pX + labelW/2, H/2, W/2 - pY - labelH/2);
          rotation.set(-Math.PI / 2, 0, 0);
        } else if (mark.area === 'F') {
          // Bottom face (Y = -H/2)
          position.set(-L/2 + pX + labelW/2, -H/2, -W/2 + pY + labelH/2);
          rotation.set(Math.PI / 2, 0, 0);
        } else {
          // Default to Front
          position.set(-L/2 + pX + labelW/2, -H/2 + pY + labelH/2, W/2);
        }

        return (
          <Decal
            key={idx}
            position={position}
            rotation={rotation}
            scale={[labelW, labelH, 1]}
          >
            <meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-1} />
            <Text
              position={[0, 0, 0.01]} // slightly in front of decal
              fontSize={labelW * 0.15}
              color="black"
              anchorX="center"
              anchorY="middle"
            >
              {mark.shippingMarkId === 0 ? 'Mới' : `ID: ${mark.shippingMarkId}`}
            </Text>
          </Decal>
        );
      })}
    </mesh>
  );
};

export default function Carton3DPreview(props: Carton3DPreviewProps) {
  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', cursor: 'grab' }}>
      <Canvas shadows camera={{ position: [props.length * 0.01 * 0.5, props.height * 0.01 * 0.8, props.width * 0.01 * 2.2], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        
        <CartonMesh {...props} />
        
        <OrbitControls makeDefault enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}
