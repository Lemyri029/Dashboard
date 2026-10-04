import { Layout } from "./components/layout/Layout";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import FileViewerPage from "./pages/FileViewerPage";
import FlowchartPage from "./pages/FlowchartPage";
import HostlyPage from "./pages/HostlyPage";
import SettingsPage from "./pages/SettingsPage";
import BoardPage from "./pages/BoardPage";
import { useDashboardStore } from "./store/dashboardStore";

export default function App() {
  const page = useDashboardStore((s) => s.page);

  function renderPage() {
    switch (page.name) {
      case "dashboard":
        return <DashboardPage />;
      case "files":
        return <FilesPage />;
      case "file":
        return <FileViewerPage path={page.path} />;
      case "flowchart":
        return <FlowchartPage path={page.path} />;
      case "hostly":
        return <HostlyPage path={page.path} />;
      case "board":
        return <BoardPage boardId={page.boardId} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  }
  
  return <Layout>{renderPage()}</Layout>;
}