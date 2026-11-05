"""Compatibilidade: as novas cartas são preservadas inteiras pelo sincronizador Node."""
from pathlib import Path
import subprocess

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    subprocess.run(['node', 'scripts/sincronizar-imagens.mjs'], cwd=root, check=True)
