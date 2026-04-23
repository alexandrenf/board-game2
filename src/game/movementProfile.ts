import { MathUtils } from 'three';
import { MOVEMENT } from './constants';

type StepVisualIndexParams = {
  currentIndex: number;
  targetIndex: number;
  currentSpeed: number;
  delta: number;
};

export type StepVisualIndexResult = {
  nextIndex: number;
  nextSpeed: number;
  direction: number;
  remainingDistance: number;
  arrived: boolean;
  speedRatio: number;
};

const getCruiseFactor = (remainingDistance: number): number => {
  const normalized = MathUtils.clamp(
    remainingDistance / MOVEMENT.decelerationDistance,
    0,
    1
  );
  // Slightly bias towards cruising speed on long travel while preserving smooth slowdown.
  return Math.pow(normalized, 0.65);
};

export const getDesiredMoveSpeed = (remainingDistance: number): number => {
  const factor = getCruiseFactor(remainingDistance);
  return MathUtils.lerp(MOVEMENT.minSpeed, MOVEMENT.maxSpeed, factor);
};

export const stepVisualIndex = ({
  currentIndex,
  targetIndex,
  currentSpeed,
  delta,
}: StepVisualIndexParams): StepVisualIndexResult => {
  if (!Number.isFinite(currentIndex) || !Number.isFinite(targetIndex)) {
    return {
      nextIndex: targetIndex,
      nextSpeed: 0,
      direction: 0,
      remainingDistance: 0,
      arrived: true,
      speedRatio: 0,
    };
  }

  const remainingDistance = Math.abs(targetIndex - currentIndex);
  const direction = targetIndex > currentIndex ? 1 : -1;
  if (delta <= 0) {
    return {
      nextIndex: currentIndex,
      nextSpeed: Math.max(0, currentSpeed),
      direction: remainingDistance <= MOVEMENT.arrivalEpsilon ? 0 : direction,
      remainingDistance,
      arrived: remainingDistance <= MOVEMENT.arrivalEpsilon,
      speedRatio: MathUtils.clamp(currentSpeed / MOVEMENT.maxSpeed, 0, 1),
    };
  }

  if (remainingDistance <= MOVEMENT.arrivalEpsilon) {
    return {
      nextIndex: targetIndex,
      nextSpeed: 0,
      direction: 0,
      remainingDistance: 0,
      arrived: true,
      speedRatio: 0,
    };
  }

  const desiredSpeed = getDesiredMoveSpeed(remainingDistance);
  const stabilizedSpeed =
    currentSpeed > 0 ? currentSpeed : Math.max(MOVEMENT.minSpeed * 0.8, MOVEMENT.arrivalEpsilon);
  const nextSpeed = MathUtils.damp(stabilizedSpeed, desiredSpeed, MOVEMENT.acceleration, delta);
  const step = nextSpeed * delta;

  if (step >= remainingDistance) {
    return {
      nextIndex: targetIndex,
      nextSpeed: 0,
      direction,
      remainingDistance: 0,
      arrived: true,
      speedRatio: 0,
    };
  }

  return {
    nextIndex: currentIndex + direction * step,
    nextSpeed,
    direction,
    remainingDistance: remainingDistance - step,
    arrived: false,
    speedRatio: MathUtils.clamp(nextSpeed / MOVEMENT.maxSpeed, 0, 1),
  };
};

export const settleVisualIndex = (currentIndex: number, targetIndex: number, delta: number): number => {
  const distance = Math.abs(targetIndex - currentIndex);
  if (distance > 5) return targetIndex;
  if (distance <= 0.01) return targetIndex;
  return currentIndex + (targetIndex - currentIndex) * Math.min(1, delta * 8);
};
