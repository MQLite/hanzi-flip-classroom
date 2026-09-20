import HanziWriter from "hanzi-writer";

export function mountStrokes(host, question) {
  const controller = new AbortController();
  let writer,
    step = 0,
    paused = false,
    playing = false,
    disposed = false;
  const content = document.createElement("div");
  host.replaceChildren(content);
  const meta = document.createElement("p");
  meta.className = "stroke-meta";
  meta.textContent = [
    question.radical && `部首：${question.radical}`,
    question.structure,
    question.components,
  ]
    .filter(Boolean)
    .join(" · ");
  content.append(meta);
  const status = document.createElement("p");
  status.id = "stroke-status";
  status.textContent = "正在准备笔顺…";
  status.setAttribute("aria-live", "polite");
  content.append(status);
  const clean = () => {
    disposed = true;
    controller.abort();
    writer?.pauseAnimation();
    content.remove();
  };
  async function load() {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}strokes/${encodeURIComponent(question.character)}.json`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (disposed) return;
      if (!Array.isArray(data.strokes) || !data.strokes.length)
        throw new Error();
      if (question.character === "行" && question.radical === "彳")
        data.radStrokes = [0, 1, 2];
      if (
        question.strokeCount &&
        question.strokeCount !== data.strokes.length
      ) {
        status.textContent =
          "笔画数与本地演示不一致，请在题库中核对；本题暂不展示动画。";
        return;
      }
      const target = document.createElement("div");
      target.id = "stroke-target";
      content.append(target);
      writer = HanziWriter.create(target, question.character, {
        width: 190,
        height: 190,
        padding: 12,
        showOutline: true,
        showCharacter: false,
        strokeColor: "#244e41",
        radicalColor:
          Array.isArray(data.radStrokes) && data.radStrokes.length
            ? "#cf702e"
            : null,
        outlineColor: "#d9e3d9",
        strokeAnimationSpeed: 1.3,
        delayBetweenStrokes: 160,
        charDataLoader: (_char, onLoad) => onLoad(data),
      });
      status.textContent = `共 ${data.strokes.length} 笔${data.radStrokes?.length ? " · 橙色标出数据中的部首笔画" : ""}`;
      const controls = document.createElement("div");
      controls.className = "stroke-controls";
      content.append(controls);
      const button = (label, action) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.onclick = action;
        controls.append(b);
        return b;
      };
      const play = button("播放", () => {
        if (paused) {
          writer.resumeAnimation();
          paused = false;
          playing = true;
          play.textContent = "暂停";
        } else if (playing) {
          writer.pauseAnimation();
          paused = true;
          playing = false;
          play.textContent = "播放";
        } else {
          playing = true;
          play.textContent = "暂停";
          writer.animateCharacter({
            onComplete: () => {
              playing = false;
              paused = false;
              play.textContent = "播放";
              status.textContent = `已完成 ${data.strokes.length} 笔`;
            },
          });
        }
      });
      button("重播", () => {
        step = 0;
        paused = false;
        playing = true;
        play.textContent = "暂停";
        writer.animateCharacter({
          onComplete: () => {
            playing = false;
            play.textContent = "播放";
            status.textContent = `已完成 ${data.strokes.length} 笔`;
          },
        });
      });
      button("逐笔", async () => {
        playing = false;
        paused = false;
        play.textContent = "播放";
        if (step >= data.strokes.length) {
          step = 0;
          await writer.hideCharacter({ duration: 0 });
        }
        writer.animateStroke(step);
        step++;
        status.textContent = `第 ${step} 笔 / 共 ${data.strokes.length} 笔`;
      });
    } catch (error) {
      if (!disposed && error.name !== "AbortError")
        status.textContent = `${question.strokeCount ? `共 ${question.strokeCount} 笔 · ` : ""}暂无笔顺演示`;
    }
  }
  // Return cleanup synchronously so navigation can abort an in-flight fetch.
  void load();
  return clean;
}
