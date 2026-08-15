import { FloatingDock, type DockItem } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconHome,
  IconLogin,
  IconUserPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router";

export default function FloatingDockDemo() {
  const navigate = useNavigate();
  const location = useLocation();

  const links: DockItem[] = [
    {
      title: "Home",
      icon: <IconHome size={20} strokeWidth={1.75} />,
      onClick: () => navigate("/"),
      isActive: location.pathname === "/",
    },
    {
      title: "AI Features",
      icon: <IconSparkles size={20} strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: "Sign In",
      icon: <IconLogin size={20} strokeWidth={1.75} />,
      onClick: () => navigate("/sign-in"),
      isActive: location.pathname.startsWith("/sign-in"),
    },
    {
      title: "Get Started",
      icon: <IconUserPlus size={20} strokeWidth={1.75} />,
      onClick: () => navigate("/sign-up"),
      isActive: location.pathname.startsWith("/sign-up"),
    },
    {
      title: "X / Twitter",
      icon: <IconBrandX size={20} strokeWidth={1.75} />,
      href: "https://x.com",
    },
    {
      title: "GitHub",
      icon: <IconBrandGithub size={20} strokeWidth={1.75} />,
      href: "https://github.com",
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <FloatingDock items={links} />
    </div>
  );
}
