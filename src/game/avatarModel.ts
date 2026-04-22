import { Color, Group, Material, Mesh, Object3D } from 'three';
import { SkeletonUtils } from 'three-stdlib';

type NamedMaterial = Material & { name?: string; color?: Color };

const cloneMeshMaterials = (object: Object3D) => {
  const mesh = object as Mesh;
  if (!mesh.isMesh) return;

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => material.clone());
    return;
  }

  mesh.material = mesh.material.clone();
};

export const cloneAvatarScene = (scene: Group): Group => {
  // Use SkeletonUtils to correctly clone skinned meshes and bone hierarchies.
  const clonedScene = SkeletonUtils.clone(scene) as Group;
  clonedScene.traverse(cloneMeshMaterials);
  return clonedScene;
};

export const applyAvatarColors = (
  object: Object3D,
  colors: { skinColor: string; hairColor: string; shirtColor: string }
) => {
  const mesh = object as Mesh;
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
