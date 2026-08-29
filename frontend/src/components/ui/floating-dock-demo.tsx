import { FloatingDock, type DockItem } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconHome,
  IconLogin,
  IconUserPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";

interface FloatingDockDemoProps {
  activeScene?: "scene1" | "scene2";
  onSelectScene?: (scene: "scene1" | "scene2") => void;
}

export default function FloatingDockDemo({
  activeScene = "scene1",
  onSelectScene,
}: FloatingDockDemoProps) {
  const navigate = useNavigate();

  const links: DockItem[] = [
    {
      title: "Home",
      icon: (
        <IconHome
          className={`h-full w-full ${activeScene === "scene1" ? "text-white" : "text-white/50"
            }`}
        />
      ),
      onClick: () => {
        if (onSelectScene) onSelectScene("scene1");
        navigate("/");
      },
    },
    {
      title: "Explore",
      icon: <IconSparkles className="h-full w-full text-white" />,
      onClick: () => navigate("/about"),
    },
    {
      title: "Sign In",
      icon: (
        <IconLogin className="h-full w-full text-white" />
      ),
      onClick: () => navigate("/sign-in"),
    },
    {
      title: "Get Started",
      icon: (
        <IconUserPlus className="h-full w-full text-white" />
      ),
      onClick: () => navigate("/sign-up"),
    },
    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-white" />
      ),
      href: "https://x.com",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-white" />
      ),
      href: "https://github.com",
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <FloatingDock items={links} />
    </div>
  );
}
