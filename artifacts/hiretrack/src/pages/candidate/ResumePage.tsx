import { useRef } from "react";
import { Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Download, Mail, MapPin, Phone, Globe } from "lucide-react";

interface ExperienceItem {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface EducationItem {
  degree: string;
  institution: string;
  field: string;
  startYear: number;
  endYear?: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return month ? `${months[parseInt(month) - 1]} ${year}` : year;
}

export default function ResumePage() {
  const { user } = useAuth();
  const resumeRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const experience = (profile?.experience as ExperienceItem[] | null) ?? [];
  const education = (profile?.education as EducationItem[] | null) ?? [];
  const skills = profile?.skills ?? [];

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/profile">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to profile
          </Link>
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Resume document */}
      <div ref={resumeRef} className="resume-paper bg-white text-gray-900 max-w-[794px] mx-auto shadow-lg rounded-sm">

        {/* Header */}
        <div className="resume-header px-12 pt-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{user?.name ?? "Your Name"}</h1>
          {profile?.headline && (
            <p className="text-base text-blue-700 font-medium mt-1">{profile.headline}</p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-gray-600">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {user.email}
              </span>
            )}
            {profile?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {profile.phone}
              </span>
            )}
            {profile?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {profile.location}
              </span>
            )}
          </div>
        </div>

        <div className="px-12 py-7 space-y-7">
          {/* Summary */}
          {profile?.bio && (
            <section>
              <h2 className="resume-section-title text-xs font-bold uppercase tracking-widest text-blue-700 mb-2 pb-1 border-b border-gray-200">
                Summary
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
            </section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <section>
              <h2 className="resume-section-title text-xs font-bold uppercase tracking-widest text-blue-700 mb-3 pb-1 border-b border-gray-200">
                Experience
              </h2>
              <div className="space-y-5">
                {experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{exp.title}</h3>
                        <p className="text-sm text-gray-600 font-medium">{exp.company}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                        {formatDate(exp.startDate)} – {exp.current ? "Present" : formatDate(exp.endDate ?? "")}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <section>
              <h2 className="resume-section-title text-xs font-bold uppercase tracking-widest text-blue-700 mb-3 pb-1 border-b border-gray-200">
                Education
              </h2>
              <div className="space-y-4">
                {education.map((edu, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{edu.degree}</h3>
                      <p className="text-sm text-gray-600">
                        {edu.institution}
                        {edu.field ? ` · ${edu.field}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                      {edu.startYear} – {edu.endYear ?? "Present"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <section>
              <h2 className="resume-section-title text-xs font-bold uppercase tracking-widest text-blue-700 mb-3 pb-1 border-b border-gray-200">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded border border-gray-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!profile?.bio && experience.length === 0 && education.length === 0 && skills.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Your profile is empty. Fill in your details on the Profile page first.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
