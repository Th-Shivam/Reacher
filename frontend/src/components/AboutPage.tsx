import { motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconBuilding,
  IconCheck,
  IconFileText,
  IconMail,
  IconPencil,
  IconSearch,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';

const SHELL = 'mx-auto min-w-0 w-full max-w-[1240px] px-5 sm:px-8 lg:px-12';
const SECTION = 'py-20 md:py-28';

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={`min-w-0 ${className ?? ''}`}>{children}</div>;
  }

  return (
    <motion.div
      className={`min-w-0 ${className ?? ''}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
      {children}
    </p>
  );
}

const WORKFLOW = [
  {
    number: '01',
    icon: IconFileText,
    title: 'Understand the fit',
    agents: 'jd_analyzer + candidate_analyzer',
    body: 'The role is reduced to its real requirements, then matched against the projects and experience that make you relevant.',
  },
  {
    number: '02',
    icon: IconSearch,
    title: 'Find the signal',
    agents: 'research_agent',
    body: 'Reacher looks for specific company context: a launch, an engineering decision, or a problem worth talking about.',
  },
  {
    number: '03',
    icon: IconPencil,
    title: 'Write from evidence',
    agents: 'outreach_writer',
    body: 'The draft connects what the company is doing with something you have actually done, without filling gaps with generic claims.',
  },
  {
    number: '04',
    icon: IconShieldCheck,
    title: 'Remove the noise',
    agents: 'reviewer_agent',
    body: 'A final pass cuts vague language and repetition before the email is placed in Gmail for your review.',
  },
];

const PRINCIPLES = [
  {
    icon: IconSearch,
    title: 'Research before generation',
    body: 'A polished paragraph is not useful if it has nothing specific to say.',
  },
  {
    icon: IconUser,
    title: 'Personal, not performative',
    body: 'Every connection in the draft should be grounded in your real experience.',
  },
  {
    icon: IconShieldCheck,
    title: 'You stay in control',
    body: 'Reacher prepares the draft. You decide what is true, useful, and ready to send.',
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-background-custom font-sans text-text-primary antialiased">
      <header className="sticky top-0 z-50 border-b border-border-subtle/90 bg-background-custom/95 backdrop-blur-xl">
        <div className={`${SHELL} flex h-17 items-center justify-between`}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-1 text-sm font-bold tracking-[0.02em] text-text-primary outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Reacher
          </button>

          <button
            type="button"
            onClick={() => navigate('/sign-up')}
            className="min-h-10 cursor-pointer rounded-md bg-text-primary px-4 py-2 text-sm font-bold text-white outline-none transition-colors hover:bg-[#333333] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-custom"
          >
            Get started
          </button>
        </div>
      </header>

      <main>
        <section className={`${SHELL} grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-28`}>
          <Reveal>
            <Eyebrow>About Reacher</Eyebrow>
            <h1 className="mt-5 max-w-[11ch] font-serif text-5xl leading-[1.02] font-medium text-text-primary sm:text-6xl lg:text-7xl">
              Reacher does the research before you write.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#666666] sm:text-lg sm:leading-8">
              Cold outreach works when it gives someone a real reason to reply.
              Reacher studies the role, the company, and your background first,
              then turns that context into a draft that could only come from you.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/sign-up')}
                className="group flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-text-primary px-5 py-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#333333] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-custom"
              >
                Create your first draft
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="min-h-11 cursor-pointer rounded-md border border-[#D8D5CB] px-5 py-3 text-sm font-bold text-[#444444] outline-none transition-colors hover:border-text-primary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                See how it works
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="relative mx-auto w-full max-w-124 lg:mx-0 lg:justify-self-end">
            <div className="relative overflow-hidden rounded-lg border border-[#E4E1D8] bg-white shadow-[0_18px_50px_rgba(26,26,26,0.08)]">
              <div className="flex h-12 items-center justify-between border-b border-border-subtle px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  <p className="text-xs font-bold tracking-[0.08em] text-[#666666] uppercase">Research brief</p>
                </div>
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#999999] uppercase">Ready</p>
              </div>

              <div className="divide-y divide-border-subtle px-5 sm:px-6">
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-5">
                  <IconBriefcase className="mt-0.5 h-4 w-4 text-[#D97706]" />
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#999999] uppercase">Role signal</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#333333]">Postgres migration and distributed systems ownership</p>
                  </div>
                </div>
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-5">
                  <IconUser className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#999999] uppercase">Your proof</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#333333]">Led a shard-rebalancing project with a similar failure mode</p>
                  </div>
                </div>
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-5">
                  <IconBuilding className="mt-0.5 h-4 w-4 text-[#16A34A]" />
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#999999] uppercase">Company context</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#333333]">Engineering writeup on holding p99 latency flat</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#DCD2FF] bg-[#F7F4FF] px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary">Subject: Your Postgres migration writeup</p>
                    <p className="mt-2 text-sm leading-6 text-[#666666]">A specific opening, backed by something you have actually built.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="border-y border-border-subtle bg-surface-hover">
          <div className={`${SHELL} grid gap-8 py-16 md:grid-cols-[0.34fr_0.66fr] md:py-20`}>
            <Reveal>
              <Eyebrow>Why it exists</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <blockquote className="max-w-3xl">
                <p className="font-serif text-3xl leading-tight font-medium text-text-primary sm:text-4xl md:text-5xl">
                  The hard part is not generating a paragraph. It is knowing
                  enough to have something worth saying.
                </p>
                <p className="mt-6 max-w-160 text-base leading-7 text-[#666666]">
                  Good outreach can take an hour of reading before the first
                  sentence. Reacher automates that preparation without taking
                  the final decision away from you.
                </p>
              </blockquote>
            </Reveal>
          </div>
        </section>

        <section id="workflow" className={`${SHELL} ${SECTION} scroll-mt-24`}>
          <Reveal className="grid gap-6 md:grid-cols-[0.4fr_0.6fr]">
            <Eyebrow>How it works</Eyebrow>
            <div>
              <h2 className="font-serif text-4xl leading-tight font-medium text-text-primary sm:text-5xl">
                Four clear stages.
              </h2>
              <p className="mt-5 max-w-148 text-base leading-7 text-[#666666]">
                Each stage narrows the next one, so the final draft is based on
                evidence instead of a template with a name swapped in.
              </p>
            </div>
          </Reveal>

          <ol className="mt-14 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:mt-20 lg:grid-cols-4">
            {WORKFLOW.map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal key={step.number} delay={index * 0.06}>
                  <li className="h-full border-t border-[#D8D5CB] pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-[0.12em] text-[#999999]">{step.number}</span>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-7 text-lg font-bold text-text-primary">{step.title}</h3>
                    <p className="mt-2 text-[10px] font-bold tracking-wider text-primary">{step.agents}</p>
                    <p className="mt-4 text-sm leading-6 text-[#666666]">{step.body}</p>
                  </li>
                </Reveal>
              );
            })}
          </ol>

          <Reveal className="mt-12 border-l-2 border-[#22C55E] bg-[#F0FDF4] px-5 py-4 md:mt-16 md:flex md:items-center md:justify-between md:gap-8">
            <div className="flex items-start gap-3">
              <IconMail className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
              <p className="text-sm leading-6 text-[#333333]">
                The result goes to your Gmail drafts. Reacher never presses send.
              </p>
            </div>
            <p className="mt-2 pl-8 text-xs font-bold tracking-[0.08em] text-[#166534] uppercase md:mt-0 md:pl-0">Human approval required</p>
          </Reveal>
        </section>

        <section className="border-y border-border-subtle bg-[#F8F7F3]">
          <div className={`${SHELL} ${SECTION} grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
            <Reveal>
              <Eyebrow>The difference</Eyebrow>
              <h2 className="mt-5 max-w-[10ch] font-serif text-4xl leading-tight font-medium text-text-primary sm:text-5xl">
                From interchangeable to unmistakably relevant.
              </h2>
              <p className="mt-6 max-w-124 text-base leading-7 text-[#666666]">
                The goal is not to make cold email sound warmer. It is to give
                the message a concrete reason to exist.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'A subject tied to something the recipient actually worked on',
                  'A connection to experience you can genuinely discuss',
                  'A draft ready to edit in the inbox you already use',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#444444]">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <article className="overflow-hidden rounded-lg border border-[#E4E1D8] bg-white shadow-[0_18px_50px_rgba(26,26,26,0.07)]">
                <div className="border-b border-border-subtle px-5 py-4 sm:px-7">
                  <div className="grid gap-2 text-xs sm:grid-cols-[4rem_1fr]">
                    <span className="font-bold tracking-[0.08em] text-[#999999] uppercase">To</span>
                    <span className="truncate text-[#444444]">priya@company.com</span>
                    <span className="font-bold tracking-[0.08em] text-[#999999] uppercase">Subject</span>
                    <span className="font-bold text-primary">Your Postgres migration writeup</span>
                  </div>
                </div>
                <div className="px-5 py-7 sm:px-7 sm:py-8">
                  <p className="max-w-156 text-[0.95rem] leading-7 text-[#444444]">
                    Hi Priya,
                    <br /><br />
                    Your writeup on holding p99 latency flat during the Postgres
                    migration is why I am writing. I spent last year on a similar
                    shard-rebalancing problem, and the failure mode you described
                    in step four cost me a weekend.
                    <br /><br />
                    I would love to compare notes and learn what your team is
                    tackling next.
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t border-border-subtle bg-[#F8F7F3] px-5 py-3 text-xs font-bold text-[#777777] sm:px-7">
                  <IconShieldCheck className="h-4 w-4 text-[#16A34A]" />
                  Saved as a draft for review
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        <section className={`${SHELL} ${SECTION}`}>
          <Reveal className="grid gap-6 md:grid-cols-[0.4fr_0.6fr]">
            <Eyebrow>Built on three principles</Eyebrow>
            <h2 className="font-serif text-4xl leading-tight font-medium text-text-primary sm:text-5xl">
              Better volume without lower standards.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3 lg:mt-20">
            {PRINCIPLES.map((principle, index) => {
              const Icon = principle.icon;

              return (
                <Reveal key={principle.title} delay={index * 0.07}>
                  <div className="border-t border-[#D8D5CB] pt-6">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-6 text-lg font-bold text-text-primary">{principle.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#666666]">{principle.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="border-t border-[#333333] bg-text-primary text-white">
          <Reveal className={`${SHELL} flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center md:py-20`}>
            <div>
              <p className="font-sans text-[10px] font-bold tracking-[0.18em] text-[#B9A9FF] uppercase">Ready when you are</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight font-medium text-white sm:text-5xl">
                Research before you reach.
              </h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/sign-in')}
                className="min-h-11 cursor-pointer rounded-md border border-white/30 px-5 py-3 text-sm font-bold text-white outline-none transition-colors hover:border-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#B9A9FF]"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate('/sign-up')}
                className="group flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-text-primary outline-none transition-colors hover:bg-[#F0ECFF] focus-visible:ring-2 focus-visible:ring-[#B9A9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-text-primary"
              >
                Get started
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
