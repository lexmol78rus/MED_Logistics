-- Add recall/block movement types (non-breaking enum extension)
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'RECALL';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'BLOCK';
