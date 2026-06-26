import os
import sys
import glob
import shutil

# pywin32가 없으면 자동 설치하도록 유도하는 메시지를 위해 임포트 시도
try:
    import win32com.client
except ImportError:
    print("Error: 'pywin32' 라이브러리가 설치되어 있지 않습니다.")
    print("cmd나 PowerShell에서 다음 명령을 실행하여 설치해 주세요:")
    print("pip install pywin32")
    sys.exit(1)

# 사내 공유 폴더 경로 및 Next.js public/pdfs 경로 정의
SHARED_DIR = r"\\iaisvr\사내공유\14.GLP 지정준비\1.SOP\0. 효력발생중인 SOP(2026.05.11.)"
WORKSPACE_PDF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "pdfs"))

def init_hwp():
    """한컴오피스 한글 COM 객체 초기화"""
    try:
        # Hwp.exe Dispatch 실행
        hwp = win32com.client.gencache.EnsureDispatch("HWPFrame.HwpObject")
        # 보안 경고 창 방지를 위한 설정 (필요 시)
        # Hwp.RegisterModule("FilePathCheckDLL", "SecurityModule")
        return hwp
    except Exception as e:
        print(f"한컴오피스 한글 초기화 실패: {e}")
        print("시스템에 한컴오피스가 정상적으로 설치되어 있는지 확인해 주세요.")
        return None

def convert_hwp_to_pdf(hwp_client, hwp_path, pdf_path):
    """한글 문서를 PDF로 변환하여 저장"""
    try:
        # 문서 열기 (보안 팝업창을 무시하기 위해 True 옵션 등 지정 가능)
        hwp_client.Open(hwp_path, "HWP", "forceopen=true")
        
        # PDF 변환 후 저장 (한글 API SaveAs의 포맷 "PDF" 적용)
        # arg 1: 저장할 절대 경로, arg 2: 파일 포맷 ("PDF")
        hwp_client.SaveAs(pdf_path, "PDF")
        
        # 문서 닫기 (저장하지 않고 닫음)
        hwp_client.Clear(1) # 1: 문서 변경 무시하고 닫기
        return True
    except Exception as e:
        print(f"변환 중 에러 발생 ({os.path.basename(hwp_path)}): {e}")
        try:
            hwp_client.Clear(1)
        except:
            pass
        return False

def main():
    print("==================================================")
    print("GLP HWP -> PDF 자동 일괄 변환기")
    print("==================================================")
    
    if not os.path.exists(SHARED_DIR):
        print(f"오류: 공유 폴더 경로를 찾을 수 없습니다.\n경로: {SHARED_DIR}")
        print("네트워크 연결 또는 서버 공유 권한을 확인해 주세요.")
        sys.exit(1)
        
    if not os.path.exists(WORKSPACE_PDF_DIR):
        print(f"작업 영역의 pdfs 폴더를 생성합니다: {WORKSPACE_PDF_DIR}")
        os.makedirs(WORKSPACE_PDF_DIR, exist_ok=True)
        
    print(f"1. 공유 폴더 탐색 시작: {SHARED_DIR}")
    
    # 하위 모든 폴더에서 .hwp 파일 검색 (재귀)
    # GLP 규정상 유효본만 변환하기 위해 경로 상에 "구", "구버전", "임시", "백업" 등이 포함된 폴더는 스캔에서 제외합니다.
    hwp_files = []
    for root, dirs, files in os.walk(SHARED_DIR):
        # 경로 세그먼트 중 구버전 폴더가 있는지 체크
        path_parts = [p.strip() for p in root.split(os.sep)]
        if any(part in ["구", "구버전", "임시", "백업"] or part.startswith("구_") for part in path_parts):
            continue

        for f in files:
            if f.lower().endswith(".hwp") and not f.startswith("~$"): # 임시 파일 제외
                hwp_files.append(os.path.join(root, f))
                
    total_files = len(hwp_files)
    print(f"   -> 총 {total_files}개의 한글 문서(.hwp)를 찾았습니다.")
    
    if total_files == 0:
        print("변환할 한글 파일이 없습니다. 종료합니다.")
        return
        
    print("2. 한컴오피스 한글 구동 중...")
    hwp = init_hwp()
    if not hwp:
        return
        
    # 중요: 한컴오피스 보안 경고 팝업("접근 허용" 버튼)이 떴을 때 
    # 사용자가 직접 보고 수동으로 [허용]을 클릭할 수 있도록 한글 창을 화면에 띄웁니다(True).
    try:
        hwp.XHwpWindows.Item(0).Visible = True
    except:
        pass
        
    print("3. 일괄 PDF 변환 시작...")
    success_count = 0
    
    for idx, hwp_path in enumerate(hwp_files, 1):
        filename = os.path.basename(hwp_path)
        name_without_ext = os.path.splitext(filename)[0]
        
        # 출력할 pdf 파일 경로 정의 (공백은 언더바로 처리하고 안전한 파일명 사용)
        safe_name = name_without_ext.replace(" ", "_")
        pdf_filename = f"{safe_name}.pdf"
        pdf_path = os.path.join(WORKSPACE_PDF_DIR, pdf_filename)
        
        print(f"[{idx}/{total_files}] 변환 중: {filename} -> {pdf_filename}")
        
        success = convert_hwp_to_pdf(hwp, hwp_path, pdf_path)
        if success:
            success_count += 1
            
    # 한글 프로그램 완전히 종료
    try:
        hwp.Quit()
    except:
        pass
        
    print("==================================================")
    print(f"변환 작업 완료: 총 {total_files}개 중 {success_count}개 성공")
    print(f"저장 경로: {WORKSPACE_PDF_DIR}")
    print("==================================================")

if __name__ == "__main__":
    main()
