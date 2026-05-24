import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const DriveAuthComplete = () => {
  const [params] = useSearchParams();
  const status = params.get("status") || "error";
  const message = params.get("message") || "";

  useEffect(() => {
    try {
      if (window.opener) {
        if (status === "success") {
          window.opener.postMessage({ type: "DRIVE_AUTH_SUCCESS" }, "*");
        } else {
          window.opener.postMessage(
            { type: "DRIVE_AUTH_ERROR", error: message || "Authorization failed" },
            "*"
          );
        }
      }
    } catch (e) {
      console.error("Failed to postMessage to opener", e);
    }
    const t = setTimeout(() => {
      try { window.close(); } catch { /* ignore */ }
    }, status === "success" ? 1200 : 3000);
    return () => clearTimeout(t);
  }, [status, message]);

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <h1 className={`text-2xl font-bold ${isSuccess ? "text-primary" : "text-destructive"}`}>
          {isSuccess ? "Google Drive Connected!" : "Authorization Failed"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isSuccess
            ? "You can close this window now."
            : message || "Something went wrong. Please try again."}
        </p>
      </div>
    </div>
  );
};

export default DriveAuthComplete;
