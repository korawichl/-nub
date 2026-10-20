import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    // Clear any broken session or cache state
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  private handleHardReset = () => {
    try {
      if (window.confirm('ต้องการรีเซ็ตแคชและโหลดใหม่หรือไม่? (ข้อมูลบันทึกในเครื่องจะยังคงอยู่)')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E9EAF2] p-6 max-w-md w-full shadow-sm text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-[#17213D] mb-2">
              เกิดข้อผิดพลาดในการโหลดหน้าเว็บ
            </h1>
            <p className="text-sm text-[#858BA0] mb-6">
              ขออภัยในความไม่สะดวก ระบบพบปัญหาในการประมวลผลบนเบราว์เซอร์นี้
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-red-50/50 rounded-xl border border-red-100 text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-700 whitespace-pre-wrap break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[#6258F5] hover:bg-[#5246E2] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                รีโหลดหน้าเว็บใหม่
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#20243A] text-sm font-medium rounded-xl transition-colors"
              >
                ล้างข้อมูลแคชเบื้องต้นแล้วโหลดใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
