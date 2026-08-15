import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconHome,
  IconLogin,
  IconUserPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";

export default function FloatingDockDemo() {
  const navigate = useNavigate();

  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Features",
      icon: (
        <IconSparkles className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#features",
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
    <div className="flex items-center justify-center w-full">
      <FloatingDock
        desktopClassName="border border-white/10 shadow-2xl bg-neutral-900/90"
        mobileClassName="translate-y-0"
        items={links}
      />
    </div>
  );
}
