// Type declarations for Google Picker API

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }): {
        requestAccessToken: (options?: { prompt?: string }) => void;
      };
    }
  }

  namespace picker {
    class PickerBuilder {
      addView(view: DocsView): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
      enableFeature(feature: Feature): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      build(): Picker;
    }

    class DocsView {
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
    }

    interface Picker {
      setVisible(visible: boolean): void;
    }

    interface PickerResponse {
      action: string;
      docs?: Array<{
        id: string;
        name: string;
        mimeType: string;
        url?: string;
      }>;
    }

    enum Feature {
      MULTISELECT_ENABLED = "MULTISELECT_ENABLED",
    }
  }
}

declare interface Window {
  google?: typeof google;
  gapi?: {
    load: (api: string, callback: () => void) => void;
  };
}
