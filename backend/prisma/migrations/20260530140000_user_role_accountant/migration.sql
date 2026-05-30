-- Add accountant role for read/export-focused access
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT' AFTER 'OPERATOR';
