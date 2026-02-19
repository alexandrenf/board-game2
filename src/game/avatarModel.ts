import * as THREE from 'three';

type NamedMaterial = THREE.Material & { name?: string; color?: THREE.Color };

const cloneMeshMaterials = (object: THREE.Object3D) => {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return;

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => material.clone());
    return;
  }

  mesh.material = mesh.material.clone();
};

export const cloneAvatarScene = (scene: THREE.Group): THREE.Group => {
  const clonedScene = scene.clone();
  clonedScene.traverse(cloneMeshMaterials);
  return clonedScene;
};

export const applyAvatarColors = (
  object: THREE.Object3D,
  colors: { skinColor: string; hairColor: string; shirtColor: string }
) => {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return;

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  materials.forEach((material) => {
    const namedMaterial = material as NamedMaterial;
    if (!namedMaterial.name || !namedMaterial.color) return;

    if (namedMaterial.name.includes('Skin')) {
      namedMaterial.color.set(colors.skinColor);
    } else if (namedMaterial.name.includes('Hair')) {
      namedMaterial.color.set(colors.hairColor);
    } else if (namedMaterial.name.includes('Shirt')) {
      namedMaterial.color.set(colors.shirtColor);
    }
  });
};
