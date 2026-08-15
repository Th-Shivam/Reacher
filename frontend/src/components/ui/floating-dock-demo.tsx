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
      title: "Home (Scene 1)",
      icon: (
        <IconHome
          className={`h-full w-full ${
            activeScene === "scene1" ? "text-indigo-400" : "text-neutral-500 dark:text-neutral-300"
          }`}
        />
      ),
      onClick: () => {
        if (onSelectScene) onSelectScene("scene1");
        navigate("/");
      },
    },
    {
      title: "Explore (Scene 2)",
      icon: (
        <IconSparkles
          className={`h-full w-full ${
            activeScene === "scene2" ? "text-indigo-400" : "text-neutral-500 dark:text-neutral-300"
          }`}
        />
      ),
      onClick: () => {
        if (onSelectScene) onSelectScene("scene2");
      },
    },
    {
      title: "Sign In",
      icon: (
        <IconLogin className="h-full w-full text-indigo-400 dark:text-indigo-400" />
      ),
      onClick: () => navigate("/sign-in"),
    },
    {
      title: "Get Started",
      icon: (
        <IconUserPlus className="h-full w-full text-purple-400 dark:text-purple-400" />
      ),
      onClick: () => navigate("/sign-up"),
    },
    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "https://x.com",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />
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
