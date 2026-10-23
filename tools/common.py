"""공통 경로. exe(PyInstaller)로 실행되면 exe가 있는 폴더가 루트다."""
import os
import sys

FROZEN = getattr(sys, "frozen", False)
ROOT = os.path.dirname(sys.executable) if FROZEN else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# bcsfe는 기본으로 문서\bcsfe 에 설정·로그·게임 데이터를 만든다. 배포한 exe를 쓰는 사람의
# 문서 폴더를 어지럽히지 않도록 우리 폴더 안으로 옮긴다.
BCSFE_DIR = os.path.join(ROOT, "bcsfe_data")


def use_local_bcsfe_dir() -> None:
    """bcsfe 데이터 폴더를 ROOT/bcsfe_data 로 지정한다.
    core.core_data.init_data() 등 bcsfe를 실제로 쓰기 전에 불러야 한다 (import만으로는 폴더가 안 생김)."""
    from bcsfe import core
    path = core.Path(BCSFE_DIR)
    path.generate_dirs()
    core.set_data_dir_path(path)
