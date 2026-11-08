import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChildren, getProject, getProjects } from "@/lib/projects";
import { pageUrl } from "@/lib/site-url";
import { ProjectView } from "./project-view";

// Every project is a committed file known at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title} — In Flight · Empire State`,
    description: project.tagline,
    openGraph: {
      title: project.title,
      description: project.tagline,
      url: pageUrl(`/projects/${project.slug}`),
      images: [pageUrl("/opengraph-image")],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.tagline,
      images: [pageUrl("/opengraph-image")],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return (
    <ProjectView
      project={project}
      parent={project.parent ? getProject(project.parent) : undefined}
      subprojects={getChildren(project.slug)}
    />
  );
}
