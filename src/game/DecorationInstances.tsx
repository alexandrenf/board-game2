import { useGLTF } from '@/src/lib/r3f/drei';
import { useFrame } from '@react-three/fiber';
import { Asset } from 'expo-asset';
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

// Leaf color palette — mix of fresh greens + warm autumn touches
const LEAF_PALETTE = [
  new THREE.Color('#7DD87D'), // Fresh green (base)
  new THREE.Color('#A8E6CF'), // Mint
  new THREE.Color('#6BB870'), // Deep green
  new THREE.Color('#B8D86B'), // Yellow-green
  new THREE.Color('#E8C86B'), // Golden autumn
  new THREE.Color('#D4956B'), // Warm amber
];

const getLeafColor = (seed: number): THREE.Color => {
  // Most trees are green, ~20% get autumn tones
  const hash = Math.abs(Math.sin(seed * 73.17 + 23.5)) % 1;
  if (hash < 0.35) return LEAF_PALETTE[0];
  if (hash < 0.55) return LEAF_PALETTE[1];
  if (hash < 0.7) return LEAF_PALETTE[2];
  if (hash < 0.82) return LEAF_PALETTE[3];
  if (hash < 0.92) return LEAF_PALETTE[4];
  return LEAF_PALETTE[5];
};

interface InstancesProps {
    data: DecorationData[];
    offsetX: number;
    offsetZ: number;
    tileSize: number;
    gap: number;
}

// -------------------------------------------------------------
// Assets Pre-declaration
// -------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rockAsset = require('../../assets/models/decor/rock.glb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const treeBranchedAsset = require('../../assets/models/decor/tree-branched.glb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const treeColumnarAsset = require('../../assets/models/decor/tree-columnar.glb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const treeOvalAsset = require('../../assets/models/decor/tree-oval.glb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const treeRoundAsset = require('../../assets/models/decor/tree-round.glb');

const resolveAssetUri = (assetModule: any) => Asset.fromModule(assetModule).uri;

const treeAssets = [
  treeBranchedAsset,
  treeColumnarAsset,
  treeOvalAsset,
  treeRoundAsset,
];

// Preload assets to avoid popping if possible
useGLTF.preload(resolveAssetUri(rockAsset));
treeAssets.forEach(a => useGLTF.preload(resolveAssetUri(a)));

// -------------------------------------------------------------
// Trees
// -------------------------------------------------------------
const TreeTypeGroup: React.FC<{ data: DecorationData[]; typeIndex: number; offsetX: number; offsetZ: number; tileSize: number; gap: number; }> = ({ data, typeIndex, offsetX, offsetZ, tileSize, gap }) => {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const leavesRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const assetUri = resolveAssetUri(treeAssets[typeIndex]);
    const gltf = useGLTF(assetUri) as any;

    const { leavesGeom, trunkGeom } = useMemo(() => {
        gltf.scene.updateMatrixWorld(true);
        let leavesGeom: THREE.BufferGeometry | null = null;
        let trunkGeom: THREE.BufferGeometry | null = null;
        
        gltf.scene.traverse((child: any) => {
            if (child.isMesh) {
                const geom = child.geometry.clone();
                geom.applyMatrix4(child.matrixWorld);
                if (child.name.toLowerCase().includes('leaves') || child.name.toLowerCase().includes('sphere') || child.name.toLowerCase().includes('icosphere')) {
                    if (!leavesGeom) leavesGeom = geom;
                } else if (child.name.toLowerCase().includes('trunk') || child.name.toLowerCase().includes('cube')) {
                    if (!trunkGeom) trunkGeom = geom;
                }
            }
        });
        
        return { leavesGeom, trunkGeom };
    }, [gltf.scene]);

    useLayoutEffect(() => {
        if (!leavesGeom || !trunkGeom) return;
        data.forEach((d, i) => {
            const x = d.col * (tileSize + gap) - offsetX;
            const z = d.row * (tileSize + gap) - offsetZ;
            const s = d.scale * 0.3; // Scale down from original 3.0 scale
            dummy.position.set(x, 0, z);
            dummy.scale.set(s, s, s);
            
            // Generate deterministic random rotation based on position
            const seed = d.row * 100 + d.col;
            const randomAngle = (Math.sin(seed) * 0.5 + 0.5) * Math.PI * 2;
            dummy.rotation.set(0, randomAngle, 0);
            
            dummy.updateMatrix();
            trunkRef.current?.setMatrixAt(i, dummy.matrix);
            leavesRef.current?.setMatrixAt(i, dummy.matrix);

            // Per-instance leaf color for variety
            if (leavesRef.current) {
                const leafColor = getLeafColor(seed);
                leavesRef.current.setColorAt(i, leafColor);
            }
        });

        if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
        if (leavesRef.current) {
            leavesRef.current.instanceMatrix.needsUpdate = true;
            if (leavesRef.current.instanceColor) leavesRef.current.instanceColor.needsUpdate = true;
        }
    }, [data, offsetX, offsetZ, tileSize, gap, dummy, leavesGeom, trunkGeom]);

    useFrame((state) => {
        if (!leavesGeom || !trunkGeom) return;
        const time = state.clock.elapsedTime;
        data.forEach((d, i) => {
             const x = d.col * (tileSize + gap) - offsetX;
             const z = d.row * (tileSize + gap) - offsetZ;
             const s = d.scale * 0.3;
             const seed = d.row * 100 + d.col;
             const randomAngle = (Math.sin(seed) * 0.5 + 0.5) * Math.PI * 2;

             const sway = Math.sin(time * 1.2 + x + z) * 0.04;
             
             dummy.position.set(x, 0, z);
             dummy.scale.set(s, s, s);
             // Gentle sway
             dummy.rotation.set(sway, randomAngle, sway);
             dummy.updateMatrix();
             trunkRef.current?.setMatrixAt(i, dummy.matrix);
             leavesRef.current?.setMatrixAt(i, dummy.matrix);
        });

        if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
        if (leavesRef.current) leavesRef.current.instanceMatrix.needsUpdate = true;
    });

    if (!leavesGeom || !trunkGeom || data.length === 0) return null;

    return (
        <group>
            <instancedMesh ref={trunkRef} args={[undefined, undefined, data.length]} geometry={trunkGeom}>
                <meshStandardMaterial 
                  color={COLORS.treeTrunk} 
                  roughness={0.8}
                  metalness={0.0}
                />
            </instancedMesh>
            <instancedMesh ref={leavesRef} args={[undefined, undefined, data.length]} geometry={leavesGeom}>
                <meshStandardMaterial 
                  color={COLORS.treeLeaves}
                  roughness={0.7}
                  metalness={0.0}
                />
            </instancedMesh>
        </group>
    );
};

const TreeInstances: React.FC<InstancesProps> = ({ data, ...props }) => {
    // Split trees randomly into the 4 types
    const groups = useMemo(() => {
        const g: DecorationData[][] = [[], [], [], []];
        data.forEach(d => {
            const hash = Math.abs(d.row * 73 + d.col * 31);
            g[hash % 4].push(d);
        });
        return g;
    }, [data]);

    return (
        <group>
            {groups.map((groupData, index) => (
                <TreeTypeGroup key={`tree-type-${index}`} data={groupData} typeIndex={index} {...props} />
            ))}
        </group>
    );
};

// -------------------------------------------------------------
// Rocks
// -------------------------------------------------------------
const RockInstances: React.FC<InstancesProps> = ({ data, offsetX, offsetZ, tileSize, gap }) => {
    const bodyRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const rockUri = resolveAssetUri(rockAsset);
    const gltf = useGLTF(rockUri) as any;
    
    const geom = useMemo(() => {
        gltf.scene.updateMatrixWorld(true);
        let g: THREE.BufferGeometry | null = null;
        gltf.scene.traverse((child: any) => {
            if (child.isMesh && !g) {
                g = child.geometry.clone();
                if (g) g.applyMatrix4(child.matrixWorld);
            }
        });
        if (g) {
            const geom = g as THREE.BufferGeometry;
            // Re-center geometry bottom to y=0 to help with consistent placement
            geom.computeBoundingBox();
            if (geom.boundingBox) {
                const minY = geom.boundingBox.min.y;
                geom.translate(0, -minY, 0);
            }
        }
        return g;
    }, [gltf.scene]);

    // Filter rocks with eyes
    const rocksWithEyes = useMemo(() => data.map((d, i) => ({...d, originalIndex: i})).filter(d => d.hasEyes), [data]);
    
    // Refs for eyes
    const eyeWhiteLRef = useRef<THREE.InstancedMesh>(null);
    const eyeWhiteRRef = useRef<THREE.InstancedMesh>(null);
    const pupilLRef = useRef<THREE.InstancedMesh>(null);
    const pupilRRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (!geom) return;
        
        // Body
        data.forEach((d, i) => {
            const x = d.col * (tileSize + gap) - offsetX;
            const z = d.row * (tileSize + gap) - offsetZ;
            const s = d.scale * 0.3; // Match with smaller, proper scale
            
            const seed = d.row * 200 + d.col;
            const randomAngle = (Math.sin(seed) * 0.5 + 0.5) * Math.PI * 2;
            
            // Sink it slightly into the ground
            dummy.position.set(x, -0.05, z);
            dummy.scale.set(s, s, s);
            // Don't rotate rocks with eyes too wildly so we can see them, 
            // but rotate plain rocks randomly
            dummy.rotation.set(0, d.hasEyes ? (randomAngle * 0.2 - 0.1) : randomAngle, 0);
            dummy.updateMatrix();
            bodyRef.current?.setMatrixAt(i, dummy.matrix);
        });
        if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;

        // Eyes
        rocksWithEyes.forEach((d, i) => {
             const x = d.col * (tileSize + gap) - offsetX;
             const z = d.row * (tileSize + gap) - offsetZ;
             const s = d.scale * 0.45; // Match body scale!
             
             // Base position roughly adjusted by scale
             const bx = x; // centered
             const by = 0.5 * s;

             // Left White
             dummy.scale.set(1, 1, 1);
             dummy.rotation.set(0, 0, 0);
             dummy.position.set(bx - 0.3 * s, by, z + 0.6 * s); // Adjusted offsets for eyes relative to scale
             dummy.updateMatrix();
             eyeWhiteLRef.current?.setMatrixAt(i, dummy.matrix);

             // Right White
             dummy.position.set(bx + 0.3 * s, by, z + 0.6 * s);
             dummy.updateMatrix();
             eyeWhiteRRef.current?.setMatrixAt(i, dummy.matrix);

             // Pupils
             dummy.position.set(bx - 0.3 * s, by, z + 0.65 * s); // forward
             dummy.updateMatrix();
             pupilLRef.current?.setMatrixAt(i, dummy.matrix);

             dummy.position.set(bx + 0.3 * s, by - 0.02 * s, z + 0.65 * s);
             dummy.updateMatrix();
             pupilRRef.current?.setMatrixAt(i, dummy.matrix);
        });
        
        [eyeWhiteLRef, eyeWhiteRRef, pupilLRef, pupilRRef].forEach(ref => {
            if(ref.current) ref.current.instanceMatrix.needsUpdate = true;
        });

    }, [data, rocksWithEyes, offsetX, offsetZ, tileSize, gap, dummy, geom]);

    if (!geom || data.length === 0) return null;

    return (
        <group>
            <instancedMesh ref={bodyRef} args={[undefined, undefined, data.length]} geometry={geom}>
                <meshStandardMaterial 
                  color={COLORS.rock}
                  roughness={0.85}
                  metalness={0.02}
                />
            </instancedMesh>
            
            {rocksWithEyes.length > 0 && (
                <>
                  <instancedMesh ref={eyeWhiteLRef} args={[undefined, undefined, rocksWithEyes.length]}>
                      <sphereGeometry args={[0.08 * 0.5, 12, 12]} />
                      <meshBasicMaterial color="#ffffff" />
                  </instancedMesh>
                  <instancedMesh ref={eyeWhiteRRef} args={[undefined, undefined, rocksWithEyes.length]}>
                      <sphereGeometry args={[0.08 * 0.5, 12, 12]} />
                       <meshBasicMaterial color="#ffffff" />
                  </instancedMesh>
                  <instancedMesh ref={pupilLRef} args={[undefined, undefined, rocksWithEyes.length]}>
                       <sphereGeometry args={[0.04 * 0.5, 8, 8]} />
                       <meshBasicMaterial color="#111111" />
                  </instancedMesh>
                   <instancedMesh ref={pupilRRef} args={[undefined, undefined, rocksWithEyes.length]}>
                       <sphereGeometry args={[0.04 * 0.5, 8, 8]} />
                       <meshBasicMaterial color="#111111" />
                  </instancedMesh>
                </>
            )}
        </group>
    );
};

// -------------------------------------------------------------
// Flowers
// -------------------------------------------------------------
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

    if (data.length === 0) return null;

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
            {trees.length > 0 && <TreeInstances data={trees} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />}
            {rocks.length > 0 && <RockInstances data={rocks} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />}
            {flowers.length > 0 && <FlowerInstances data={flowers} offsetX={offsetX} offsetZ={offsetZ} tileSize={tileSize} gap={gap} />}
        </group>
    );
});
DecorationInstances.displayName = 'DecorationInstances';
