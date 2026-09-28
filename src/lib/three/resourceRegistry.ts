/**
 * HavenArt — Shared Three.js Resource Registry with Reference Counting
 * Contract Version: havenart-contracts-1.1
 * References: docs/ASSET_PIPELINE.md, docs/SCENE_ARCHITECTURE.md
 */

import { Object3D, Group, Material, BufferGeometry, Texture } from 'three';

export interface DisposableResource {
  dispose(): void;
}

interface RefCountEntry<T extends DisposableResource> {
  resource: T;
  refCount: number;
}

export class ResourceRegistry {
  private materials = new Map<string, RefCountEntry<Material>>();
  private geometries = new Map<string, RefCountEntry<BufferGeometry>>();
  private textures = new Map<string, RefCountEntry<Texture>>();
  private proxyFactories = new Map<string, () => Object3D>();

  // --- Material Management ---
  registerMaterial(id: string, material: Material): Material {
    const existing = this.materials.get(id);
    if (existing) {
      existing.refCount++;
      return existing.resource;
    }
    this.materials.set(id, { resource: material, refCount: 1 });
    return material;
  }

  getMaterial(id: string): Material | null {
    return this.materials.get(id)?.resource || null;
  }

  retainMaterial(id: string): Material | null {
    const entry = this.materials.get(id);
    if (!entry) return null;
    entry.refCount++;
    return entry.resource;
  }

  releaseMaterial(id: string): void {
    const entry = this.materials.get(id);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.resource.dispose();
      this.materials.delete(id);
    }
  }

  getMaterialRefCount(id: string): number {
    return this.materials.get(id)?.refCount ?? 0;
  }

  // --- Geometry Management ---
  registerGeometry(id: string, geometry: BufferGeometry): BufferGeometry {
    const existing = this.geometries.get(id);
    if (existing) {
      existing.refCount++;
      return existing.resource;
    }
    this.geometries.set(id, { resource: geometry, refCount: 1 });
    return geometry;
  }

  getGeometry(id: string): BufferGeometry | null {
    return this.geometries.get(id)?.resource || null;
  }

  retainGeometry(id: string): BufferGeometry | null {
    const entry = this.geometries.get(id);
    if (!entry) return null;
    entry.refCount++;
    return entry.resource;
  }

  releaseGeometry(id: string): void {
    const entry = this.geometries.get(id);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.resource.dispose();
      this.geometries.delete(id);
    }
  }

  getGeometryRefCount(id: string): number {
    return this.geometries.get(id)?.refCount ?? 0;
  }

  // --- Texture Management ---
  registerTexture(id: string, texture: Texture): Texture {
    const existing = this.textures.get(id);
    if (existing) {
      existing.refCount++;
      return existing.resource;
    }
    this.textures.set(id, { resource: texture, refCount: 1 });
    return texture;
  }

  getTexture(id: string): Texture | null {
    return this.textures.get(id)?.resource || null;
  }

  retainTexture(id: string): Texture | null {
    const entry = this.textures.get(id);
    if (!entry) return null;
    entry.refCount++;
    return entry.resource;
  }

  releaseTexture(id: string): void {
    const entry = this.textures.get(id);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.resource.dispose();
      this.textures.delete(id);
    }
  }

  getTextureRefCount(id: string): number {
    return this.textures.get(id)?.refCount ?? 0;
  }

  // --- Procedural Proxy Factories ---
  registerProxyFactory(zoneId: string, factory: () => Object3D): void {
    this.proxyFactories.set(zoneId, factory);
  }

  createProxy(zoneId: string): Object3D {
    const factory = this.proxyFactories.get(zoneId);
    if (factory) {
      return factory();
    }
    // Default procedural fallback group with name tag
    const group = new Group();
    group.name = `proxy_${zoneId}`;
    return group;
  }

  // --- Global Cleanup / Context Loss ---
  dispose(): void {
    for (const entry of this.materials.values()) {
      entry.resource.dispose();
    }
    this.materials.clear();

    for (const entry of this.geometries.values()) {
      entry.resource.dispose();
    }
    this.geometries.clear();

    for (const entry of this.textures.values()) {
      entry.resource.dispose();
    }
    this.textures.clear();

    this.proxyFactories.clear();
  }
}

// Global default singleton registry for application runtime
export const defaultResourceRegistry = new ResourceRegistry();
