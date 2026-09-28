'use client';

/**
 * HavenArt — Zone Boundary & Safe Fallback Reconciler
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W11):
 * - W11-AC2: Decorative failure dùng proxy, core/context failure về static.
 */

import React from 'react';
import '@react-three/fiber';
import type { ZoneHandle } from '@/types/scene';

export interface ZoneBoundaryProps {
  readonly zoneId?: string;
  readonly isCore?: boolean;
  readonly fallback?: React.ReactNode;
  readonly onCoreFailure?: (error: Error) => void;
  readonly residentHandles?: readonly ZoneHandle[];
  readonly children?: React.ReactNode;
}

interface ZoneBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

/**
 * Error boundary wrapping 3D scene zones.
 * For decorative assets, errors are caught and procedural proxies are rendered (W11-AC2).
 * For core assets, errors trigger onCoreFailure so the experience gate transitions to static mode.
 */
export class ZoneBoundary extends React.Component<ZoneBoundaryProps, ZoneBoundaryState> {
  constructor(props: ZoneBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ZoneBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    if (this.props.isCore && this.props.onCoreFailure) {
      this.props.onCoreFailure(error);
    }
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return null;
    }

    return (
      <group name={`zone-boundary-${this.props.zoneId ?? 'root'}`}>
        {this.props.children}
        {this.props.residentHandles?.map((handle) => (
          <primitive key={handle.id} object={handle.root} />
        ))}
      </group>
    );
  }
}

export default ZoneBoundary;
