import { getInFlightPlan } from "@/lib/in-flight-plan";
import { getProjects } from "@/lib/projects";
import { ProjectsIndex } from "./projects-index";

export default function ProjectsPage() {
  return <ProjectsIndex projects={getProjects()} plan={getInFlightPlan()} />;
}
