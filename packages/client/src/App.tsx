import Topbar from "./components/Topbar";
import SidebarLeft from "./components/SidebarLeft";
import Content from "./components/Content";
import SidebarRight from "./components/SidebarRight";

export default function App() {
  return (
    <>
      <Topbar />
      <div className="main">
        <SidebarLeft />
        <Content />
        <SidebarRight />
      </div>
    </>
  );
}
