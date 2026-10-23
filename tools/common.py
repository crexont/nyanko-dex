"""공통 경로. exe(PyInstaller)로 실행되면 exe가 있는 폴더가 루트다."""
import os
import sys

FROZEN = getattr(sys, "frozen", False)
ROOT = os.path.dirname(sys.executable) if FROZEN else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
