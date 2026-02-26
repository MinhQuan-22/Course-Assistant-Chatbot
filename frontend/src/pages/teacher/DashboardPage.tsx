// src/pages/teacher/DashboardPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import manWithLaptop from "@/assets/icons/manwithlaptop.jpg";

type DemoClass = {
  code: string;
  name: string;
  progress: number;
  img: string;
  students: number;
};

type TopStudent = {
  name: string;
  score: number;
  avatar: string;
  classCode: string;
};

type ActivityItem = {
  title: string;
  meta: string;
  time: string;
};

export default function DashboardPage() {
  const demoClasses: DemoClass[] = useMemo(
    () => [
      { code: "21020105", name: "Intro to Programming", progress: 0.55, students: 32, img: manWithLaptop },
      { code: "21020106", name: "Web Fundamentals", progress: 0.65, students: 28, img: manWithLaptop },
      { code: "21020107", name: "OOP Basics", progress: 0.35, students: 41, img: manWithLaptop },
      { code: "21020108", name: "Data Structures", progress: 0.78, students: 25, img: manWithLaptop },
    ],
    [],
  );

  const topStudents: TopStudent[] = useMemo(
    () => [
      { name: "Nguyen Van A", score: 95, avatar: "https://i.pravatar.cc/80?img=12", classCode: "21020105" },
      { name: "Tran Thi B", score: 91, avatar: "https://i.pravatar.cc/80?img=32", classCode: "21020106" },
      { name: "Le Van C", score: 88, avatar: "https://i.pravatar.cc/80?img=45", classCode: "21020107" },
    ],
    [],
  );

  const activity: ActivityItem[] = useMemo(
    () => [
      { title: "New upload added", meta: "Lecture_Week3.pdf • 21020105", time: "2h ago" },
      { title: "Quiz submitted", meta: "Quiz 1 • 21020106", time: "5h ago" },
      { title: "New student joined", meta: "21020107", time: "Yesterday" },
    ],
    [],
  );

  // Classes carousel scrolling
  const classesRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = classesRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    const eps = 2;
    setCanLeft(x > eps);
    setCanRight(x < max - eps);
  };

  const scrollClasses = (dir: "left" | "right") => {
    const el = classesRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.75);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    updateArrows();
    const el = classesRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
    };
  }, []);

  return (
    <div className="tdash">
      {/* Header (compact) */}
      <div className="tdash-header">
        <div>
          <div className="tdash-kicker">Teacher Dashboard</div>
          <h1 className="tdash-title">Welcome back</h1>
          <div className="tdash-sub">Quick overview of your classes and student progress.</div>
        </div>

        <div className="tdash-pills">
          <span className="tdash-pill">Term: Spring 2026</span>
          <span className="tdash-pill">Active classes: {demoClasses.length}</span>
        </div>
      </div>

      {/* Main grid (2 columns from the top) */}
      <div className="tdash-grid">
        {/* LEFT column: stats + classes */}
        <div className="tdash-left">
          <div className="tdash-stats">
            <TStat title="Recent uploads" value="12" hint="Last 7 days" />
            <TStat title="Uploaded files" value="32" hint="Total" />
            <TStat title="Students" value="126" hint="Across classes" />
            <TStat title="Quizzes" value="8" hint="Created this month" />
          </div>

          <section className="tdash-card">
            <div className="tdash-card-head">
              <div>
                <div className="tdash-card-title">Your classes</div>
                <div className="tdash-card-sub">Scroll to view all classes</div>
              </div>

              <div className="tdash-card-actions">
                <button
                  className="tdash-arrow"
                  type="button"
                  onClick={() => scrollClasses("left")}
                  disabled={!canLeft}
                  aria-label="Scroll classes left"
                >
                  ‹
                </button>
                <button
                  className="tdash-arrow"
                  type="button"
                  onClick={() => scrollClasses("right")}
                  disabled={!canRight}
                  aria-label="Scroll classes right"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="tdash-carousel" ref={classesRef}>
              {demoClasses.map((c) => (
                <article className="tclass" key={c.code}>
                  <div className="tclass-img" style={{ backgroundImage: `url(${c.img})` }} />
                  <div className="tclass-body">
                    <div className="tclass-top">
                      <div className="tclass-name">{c.name}</div>
                      <div className="tclass-code">{c.code}</div>
                    </div>

                    <div className="tclass-meta">
                      <span>{c.students} students</span>
                      <span>•</span>
                      <span>{Math.round(c.progress * 100)}% progress</span>
                    </div>

                    <div className="tclass-track">
                      <div className="tclass-fill" style={{ width: `${c.progress * 100}%` }} />
                    </div>

                    <div className="tclass-actions">
                      <button className="tbtn tbtn-primary" type="button">
                        Open
                      </button>
                      <button className="tbtn" type="button">
                        Invite
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT column: sticky top students + activity */}
        <aside className="tdash-right tdash-right-sticky">
          <section className="tdash-card">
            <div className="tdash-card-head">
              <div>
                <div className="tdash-card-title">Top students</div>
                <div className="tdash-card-sub">This week’s best performance</div>
              </div>
            </div>

            <div className="tlist">
              {topStudents.map((s, idx) => (
                <div className="tstudent" key={s.name}>
                  <img className="tstudent-avatar" src={s.avatar} alt={s.name} />
                  <div className="tstudent-info">
                    <div className="tstudent-name">{s.name}</div>
                    <div className="tstudent-sub">
                      Class {s.classCode} • Score {s.score}
                    </div>
                  </div>
                  <div className="tstudent-rank">#{idx + 1}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="tdash-card">
            <div className="tdash-card-head">
              <div>
                <div className="tdash-card-title">Recent activity</div>
                <div className="tdash-card-sub">Latest actions in your workspace</div>
              </div>
            </div>

            <div className="tactivity">
              {activity.map((a, i) => (
                <div className="tactivity-item" key={i}>
                  <div className="tactivity-title">{a.title}</div>
                  <div className="tactivity-meta">{a.meta}</div>
                  <div className="tactivity-time">{a.time}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TStat({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="tstat">
      <div className="tstat-title">{title}</div>
      <div className="tstat-value">{value}</div>
      <div className="tstat-hint">{hint}</div>
    </div>
  );
}