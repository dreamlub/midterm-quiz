(function () {
  const NUM = ["①", "②", "③", "④", "⑤"];
  const app = document.getElementById("app");
  const sets = window.QUIZ_SETS;

  // 세트별 진행 상황: { order: [문제 번호], i: 현재 위치, results: { 문제 번호: true/false } }
  const store = {
    get(id) {
      try { return JSON.parse(localStorage.getItem("quiz:" + id)); } catch { return null; }
    },
    set(id, s) { localStorage.setItem("quiz:" + id, JSON.stringify(s)); },
    clear(id) { localStorage.removeItem("quiz:" + id); },
  };

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c != null) e.append(c);
    return e;
  }

  function render(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }

  // 홈: 세트 고르기
  function home() {
    const list = sets.map((set) => {
      const s = store.get(set.id);
      const inProgress = s && s.i < s.order.length;
      const sub = inProgress ? `${s.i} / ${s.order.length} 풀었음` : `${set.questions.length}문제`;
      return el("div", { class: "set" },
        el("div", {}, el("div", { class: "name" }, set.title), el("div", { class: "sub" }, sub)),
        el("div", { class: "row", style: "margin:0" },
          inProgress ? el("button", { class: "btn ghost", onclick: () => start(set, true) }, "새로 풀기") : null,
          el("button", { class: "btn", onclick: () => start(set, !inProgress) }, inProgress ? "이어 풀기" : "시작"),
        ),
      );
    });
    render(el("h1", {}, "중1 2학기 중간고사 연습"), ...list);
  }

  function start(set, fresh, order) {
    if (fresh) store.set(set.id, { order: order || set.questions.map((_, k) => k), i: 0, results: {} });
    question(set);
  }

  // 문제 한 개
  function question(set) {
    const s = store.get(set.id);
    if (s.i >= s.order.length) return finish(set);
    const qi = s.order[s.i];
    const q = set.questions[qi];
    const isLast = s.i === s.order.length - 1;

    const top = el("div", { class: "top" },
      el("button", { class: "back", onclick: home }, "‹ 목록"),
      el("div", { class: "title" }, set.title),
      el("div", { class: "count" }, `${s.i + 1} / ${s.order.length}`),
    );
    const bar = el("div", { class: "bar" }, el("div", { style: `width:${(s.i / s.order.length) * 100}%` }));

    const mcqCount = set.questions.filter((x) => x.type === "mcq").length;
    const label = q.type === "mcq" ? `객관식 ${qi + 1}번` : `서술형 ${qi - mcqCount + 1}번`;
    const card = el("div", { class: "card" },
      el("div", { class: "kind" }, label),
      el("div", { class: "stem", html: q.stem }),
      q.extra ? el("div", { html: q.extra }) : null,
    );
    const footer = el("div", { class: "row" });

    function save(correct) {
      s.results[qi] = correct;
      s.i += 1;
      store.set(set.id, s);
    }
    const nextBtn = () => el("button", { class: "btn", onclick: () => question(set) }, isLast ? "결과 보기" : "다음");

    if (q.type === "mcq") {
      const opts = el("div", { class: "opts" });
      const buttons = q.options.map((text, k) => {
        const b = el("button", { class: "opt" }, el("span", { class: "n" }, NUM[k]), el("span", { html: text }));
        b.addEventListener("click", () => {
          const correct = k === q.answer;
          buttons.forEach((x) => (x.disabled = true));
          buttons[q.answer].classList.add("ok");
          if (!correct) b.classList.add("bad");
          card.append(el("div", { class: "result " + (correct ? "ok" : "bad") },
            el("div", { class: "head" }, correct ? "정답" : `오답 · 정답 ${NUM[q.answer]}`),
            el("div", { html: q.exp }),
          ));
          save(correct);
          footer.replaceChildren(nextBtn());
          footer.firstChild.focus();
        });
        return b;
      });
      opts.append(...buttons);
      card.append(opts);
    } else {
      const ta = el("textarea", { placeholder: "답을 써 보세요" });
      card.append(ta);
      const reveal = el("button", { class: "btn" }, "예시 답안 보기");
      reveal.addEventListener("click", () => {
        ta.readOnly = true;
        card.append(el("div", { class: "result" },
          el("div", { class: "head" }, "예시 답안"),
          el("div", { html: q.exp }),
        ));
        const grade = (correct) => () => { save(correct); question(set); };
        footer.replaceChildren(
          el("button", { class: "btn", onclick: grade(true) }, "맞았어요"),
          el("button", { class: "btn ghost", onclick: grade(false) }, "틀렸어요"),
        );
      });
      footer.append(reveal);
    }

    render(top, bar, card, footer);
  }

  // 결과
  function finish(set) {
    const s = store.get(set.id);
    const done = s.order.filter((qi) => qi in s.results);
    const right = done.filter((qi) => s.results[qi]).length;
    const wrong = done.filter((qi) => !s.results[qi]);
    const mcqCount = set.questions.filter((x) => x.type === "mcq").length;
    const name = (qi) => (qi < mcqCount ? `객관식 ${qi + 1}번` : `서술형 ${qi - mcqCount + 1}번`);
    const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };

    const nodes = [
      el("div", { class: "top" },
        el("button", { class: "back", onclick: home }, "‹ 목록"),
        el("div", { class: "title" }, set.title),
      ),
      el("div", { class: "card" },
        el("div", { class: "kind" }, "맞힌 문제"),
        el("div", { class: "score" }, `${right} / ${done.length}`),
      ),
    ];
    if (wrong.length) {
      nodes.push(
        el("h2", {}, `틀린 문제 ${wrong.length}개`),
        el("ul", { class: "wrong" }, ...wrong.map((qi) =>
          el("li", {}, el("span", {}, name(qi) + " · "), plain(set.questions[qi].stem)))),
      );
    }
    nodes.push(el("div", { class: "row" },
      wrong.length ? el("button", { class: "btn", onclick: () => start(set, true, wrong) }, "틀린 문제 다시 풀기") : null,
      el("button", { class: wrong.length ? "btn ghost" : "btn", onclick: () => start(set, true) }, "처음부터 다시"),
    ));
    render(...nodes);
  }

  home();
})();
