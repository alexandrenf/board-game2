import { useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from './constants';

export interface DecorationData {
    row: number;
    col: number;
    type: 'tree' | 'rock' | 'flower';
    scale: number;
    hasEyes?: boolean;
}

interface InstancesProps {
    data: DecorationData[];
    offsetX: number;
    offsetZ: number;
    tileSize: number;
    gap: number;
}

const TreeInstances: React.FC<InstancesProps> = ({ data, offsetX, offsetZ, tileSize, gap }) => {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const leavesRef = useRef<THREE.InstancedMesh>(null);
    const leavesAltRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useLayoutEffect(() => {
        data.forEach((d, i) => {
            const x = d.col * (tileSize + gap) - offsetX;
            const z = d.row * (tileSize + gap) - offsetZ;
            const s = d.scale;

            // Trunk
            dummy.position.set(x, 0.4 * s, z);
            dummy.scale.set(s, s, s);
            dummy.rotation.set(0, 0, 0); // Reset rotation
            dummy.updateMatrix();
            trunkRef.current?.setMatrixAt(i, dummy.matrix);

            // Leaves Main (Middle + Left)
            // Combine these positions? Or just animate one main blob?
            // WhimsicalTree: Middle(0, 0.9, 0), Left(-0.15, 1.0, -0.1)
            // We'll use leavesRef for the main big sphere
            dummy.position.set(x, 0.9 * s, z);
            dummy.updateMatrix();
            leavesRef.current?.setMatrixAt(i, dummy.matrix);

            // Leaves Alt (Right)
            // WhimsicalTree: Right(0.2, 1.1, 0.15)
            dummy.position.set(x + 0.2 * s, 1.1 * s, z + 0.15 * s);
            dummy.updateMatrix();
            leavesAltRef.current?.setMatrixAt(i, dummy.matrix);
        });
        
        [trunkRef, leavesRef, leavesAltRef].forEach(ref => {
            if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
        });
    }, [data, offsetX, offsetZ, tileSize, gap, dummy]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        data.forEach((d, i) => {
             const x = d.col * (tileSize + gap) - offsetX;
             const z = d.row * (tileSize + gap) - offsetZ;
             const s = d.scale;

             // Sway logic
             const sway = Math.sin(time * 1.2 + x) * 0.05;
             
             // Update transforms with sway rotation
             // Trunk
             dummy.position.set(x, 0.4 * s, z);
             dummy.scale.set(s, s, s);
             dummy.rotation.set(0, 0, sway);
             dummy.updateMatrix();
             trunkRef.current?.setMatrixAt(i, dummy.matrix);
             
             // Leaves Main (roughly following sway)
             // Simplified: pivot around trunk base? 
             // Proper hierarchy needs multiple multiplies.
             // For "indie" sway, just rotating around center is okay if small.
             
             // Leaves Main
             dummy.position.set(x - sway * 0.9 * s, 0.9 * s, z); // simple fake shear
             dummy.rotation.set(0, 0, sway * 1.5);
             dummy.updateMatrix();
             leavesRef.current?.setMatrixAt(i, dummy.matrix);

             // Leaves Alt
             dummy.position.set(x + 0.2*s - sway * 1.1 * s, 1.1 * s, z + 0.15 * s);
             dummy.rotation.set(0, 0, sway * 1.5);
             dummy.updateMatrix();
             leavesAltRef.current?.setMatrixAt(i, dummy.matrix);
        });

        [trunkRef, leavesRef, leavesAltRef].forEach(ref => {
            if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
        });
    });

    return (
        <group>
            {/* Trunk */}
            <instancedMesh ref={trunkRef} args={[undefined, undefined, data.length]}>
                <cylinderGeometry args={[0.08, 0.14, 0.85, 10]} />
                <meshStandardMaterial 
                  color={COLORS.treeTrunk} 
                  roughness={0.8}
                  metalness={0.0}
                />
            </instancedMesh>
            {/* Leaves Main */}
            <instancedMesh ref={leavesRef} args={[undefined, undefined, data.length]}>
                <sphereGeometry args={[0.48, 20, 16]} />
                <meshStandardMaterial 
                  color={COLORS.treeLeaves}
                  roughness={0.7}
                  metalness={0.0}
                />
            </instancedMesh>
            {/* Leaves Alt */}
            <instancedMesh ref={leavesAltRef} args={[undefined, undefined, data.length]}>
                <sphereGeometry args={[0.32, 16, 12]} />
                <meshStandardMaterial 
                  color={COLORS.treeLeavesAlt}
                  roughness={0.65}
                  metalness={0.0}
                />
            </instancedMesh>
        </group>
    );
};

const RockInstances: React.FC<InstancesProps> = ({ data, offsetX, offsetZ, tileSize, gap }) => {
    const bodyRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Filter rocks with eyes
    const rocksWithEyes = useMemo(() => data.map((d, i) => ({...d, originalIndex: i})).filter(d => d.hasEyes), [data]);
    
    // Refs for eyes
    const eyeWhiteLRef = useRef<THREE.InstancedMesh>(null);
    const eyeWhiteRRef = useRef<THREE.InstancedMesh>(null);
    const pupilLRef = useRef<THREE.InstancedMesh>(null);
    const pupilRRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        // Body
        data.forEach((d, i) => {
            const x = d.col * (tileSize + gap) - offsetX;
            const z = d.row * (tileSize + gap) - offsetZ;
            const s = d.scale;
            dummy.position.set(x, 0.25 * s, z);
            dummy.scale.set(s, s * 0.6, s);
            dummy.updateMatrix();
            bodyRef.current?.setMatrixAt(i, dummy.matrix);
        });
        if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;

        // Eyes
        rocksWithEyes.forEach((d, i) => {
             const x = d.col * (tileSize + gap) - offsetX;
             const z = d.row * (tileSize + gap) - offsetZ;
             const s = d.scale;
             
             // Base position roughly adjusted by scale
             const bx = x; // centered
             const by = 0.35 * s;

             // Left White
             dummy.scale.set(1, 1, 1);
             dummy.position.set(bx - 0.12 * s, by, z + 0.15 * s); // Adjusted Z manually
             dummy.updateMatrix();
             eyeWhiteLRef.current?.setMatrixAt(i, dummy.matrix);

             // Right White
             dummy.position.set(bx + 0.12 * s, by, z + 0.15 * s);
             dummy.updateMatrix();
             eyeWhiteRRef.current?.setMatrixAt(i, dummy.matrix);

             // Pupils
             dummy.position.set(bx - 0.12 * s, by, z + 0.18 * s); // forward
             dummy.updateMatrix();
             pupilLRef.current?.setMatrixAt(i, dummy.matrix);

             dummy.position.set(bx + 0.12 * s, by - 0.02*s, z + 0.18 * s);
             dummy.updateMatrix();
             pupilRRef.current?.setMatrixAt(i, dummy.matrix);
        });
        
        [eyeWhiteLRef, eyeWhiteRRef, pupilLRef, pupilRRef].forEach(ref => {
            if(ref.current) ref.current.instanceMatrix.needsUpdate = true;
        });

    }, [data, rocksWithEyes, offsetX, offsetZ, tileSize, gap, dummy]);

    return (
        <group>
            <instancedMesh ref={bodyRef} args={[undefined, undefined, data.length]}>
                <dodecahedronGeometry args={[0.42, 1]} />
                <meshStandardMaterial 
                  color={COLORS.rock}
                  roughness={0.85}
                  metalness={0.02}
                />
            </instancedMesh>
            
            {rocksWithEyes.length > 0 && (
                <>
                  <instancedMesh ref={eyeWhiteLRef} args={[undefined, undefined, rocksWithEyes.length]}>
                      <sphereGeometry args={[0.08, 12, 12]} />
                      <meshBasicMaterial color="#ffffff" />
                  </instancedMesh>
                  <instancedMesh ref={eyeWhiteRRef} args={[undefined, undefined, rocksWithEyes.length]}>
                      <sphereGeometry args={[0.08, 12, 12]} />
                       <meshBasicMaterial color="#ffffff" />
                  </instancedMesh>
                  <instancedMesh ref={pupilLRef} args={[undefined, undefined, rocksWithEyes.length]}>
                       <sphereGeometry args={[0.04, 8, 8]} />
                       <meshBasicMaterial color="#111111" />
                  </instancedMesh>
                   <instancedMesh ref={pupilRRef} args={[undefined, undefined, rocksWithEyes.length]}>
                       <sphereGeometry args={[0.04, 8, 8]} />
                       <meshBasicMaterial color="#111111" />
                  </instancedMesh>
                </>
            )}
        </group>
    );
};

const FlowerInstances: React.FC<InstancesProps> = ({ data, offsetX, offsetZ, tileSize, gap }) => {
    const stemRef = useRef<THREE.InstancedMesh>(null);
    const centerRef = useRef<THREE.InstancedMesh>(null);
    const petalsRef = useRef<THREE.InstancedMesh>(null); // Many more instances!
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useLayoutEffect(() => {
        if (!stemRef.current || !centerRef.current || !petalsRef.current) return;

        // Enhanced petal colors from our palette
        const colors = [
          COLORS.accentPink || '#FFB3BA',
          COLORS.accentYellow || '#FFE066', 
          COLORS.accentBlue || '#BAE1FF', 
          COLORS.accentPurple || '#E2B6FF'
        ];

        let petalIndex = 0;
        data.forEach((d, i) => {
            const x = d.col * (tileSize + gap) - offsetX;
            const z = d.row * (tileSize + gap) - offsetZ;
            
            // Stem
            dummy.scale.set(1, 1, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.position.set(x, 0.15, z);
            dummy.updateMatrix();
            stemRef.current!.setMatrixAt(i, dummy.matrix);

            // Center
            dummy.position.set(x, 0.35, z);
            dummy.updateMatrix();
            centerRef.current!.setMatrixAt(i, dummy.matrix);

            // Petals (5 per flower)
             const petalColor = new THREE.Color(colors[i % colors.length]);
             for (let p = 0; p < 5; p++) {
                const angle = (p * Math.PI * 2) / 5;
                const px = Math.cos(angle) * 0.1;
                const pz = Math.sin(angle) * 0.1;
                
                dummy.position.set(x + px, 0.35, z + pz);
                dummy.updateMatrix();
                petalsRef.current!.setMatrixAt(petalIndex, dummy.matrix);
                petalsRef.current!.setColorAt(petalIndex, petalColor);
                petalIndex++;
             }
        });
        
        stemRef.current.instanceMatrix.needsUpdate = true;
        centerRef.current.instanceMatrix.needsUpdate = true;
        petalsRef.current.instanceMatrix.needsUpdate = true;
        petalsRef.current.instanceColor!.needsUpdate = true;
        
    }, [data, offsetX, offsetZ, tileSize, gap, dummy]);

    return (
        <group>
            <instancedMesh ref={stemRef} args={[undefined, undefined, data.length]}>
                 <cylinderGeometry args={[0.025, 0.025, 0.32, 8]} />
                 <meshStandardMaterial color="#5DBE6E" roughness={0.7} />
            </instancedMesh>
            <instancedMesh ref={centerRef} args={[undefined, undefined, data.length]}>
                 <sphereGeometry args={[0.07, 10, 10]} />
                 <meshStandardMaterial color={COLORS.accentYellow || '#FFE066'} roughness={0.4} />
            </instancedMesh>
            {/* 5 petals per flower */}
            <instancedMesh ref={petalsRef} args={[undefined, undefined, data.length * 5]}>
                 <sphereGeometry args={[0.09, 10, 8]} />
                 <meshStandardMaterial roughness={0.5} />
            </instancedMesh>
        </group>
    );
};

export const DecorationInstances: React.FC<InstancesProps> = React.memo(({ data, offsetX, offsetZ, tileSize, gap }) => {
    const trees = useMemo(() => data.filter(d => d.type === 'tree'), [data]);
    const rocks = useMemo(() => data.filter(d => d.type === 'rock'), [data]);
    const flowers = useMemo(() => data.filter(d => d.type === 'flower'), [data]);

    return (
        <group>
            <TreeInstances data={trees} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />
            <RockInstances data={rocks} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />
            <FlowerInstances data={flowers} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />
        </group>
    );
});
DecorationInstances.displayName = 'DecorationInstances';
