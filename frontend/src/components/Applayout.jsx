import Sidebar from "./Sidebar";
import "./AppLayout.css";

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">{children}</div>
    </div>
  );
}

export default AppLayout;