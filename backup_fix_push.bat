@echo off
cd /d "C:\Users\CloudX_001\Videos\AnyDesk\Projetos Dan\Manage\football-teams-manager"

echo ==========================================
echo Resolving Git Conflicts & Pushing Fixes...
echo ==========================================

:: 1. Abort any stuck rebase
git rebase --abort

:: 2. Backup critical files
copy App.tsx App.tsx.bak
copy services\supabase.ts services\supabase.ts.bak

:: 3. Reset to match remote (this discards local uncommitted changes, hence backup)
git fetch origin
git reset --hard origin/main

:: 4. Restore our fixes
copy /Y App.tsx.bak App.tsx
copy /Y services\supabase.ts.bak services\supabase.ts

:: 5. Commit and Push
git add .
git commit -m "fix(auth): resolve conflicts and apply critical auth fixes"
git push origin main

echo ==========================================
echo Fixes Pushed Successfully.
pause
