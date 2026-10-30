import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Raise amounts exactly as stated in Alex's published recap post (2026-09-28, lnkd.in/p/eQTcjYYZ)
# The ~$160M combined figure is host Ivor Stratford's on-stage count (as published in the recap).
companies = ["Warp", "Solstice", "Amperos Health", "Pascal", "Soxton AI", "Holly"]
raises = [60, 21, 16, 5, 2.5, 2.2]  # $M
stages = ["Series B", "Series A", "Series A", "(per founder, on stage)", "Pre-seed", "Pre-seed"]

BG = "#0f1115"; BAR = "#b8f43a"; TXT = "#e8eaf0"; MUT = "#9aa0ab"
fig, ax = plt.subplots(figsize=(9, 5), dpi=200)
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
bars = ax.barh(companies[::-1], raises[::-1], color=BAR, height=0.62)
for bar, r, s in zip(bars, raises[::-1], stages[::-1]):
    ax.text(bar.get_width() + 1.0, bar.get_y() + bar.get_height()/2,
            f"${r:g}M  ·  {s}", va="center", ha="left", color=TXT, fontsize=10)
ax.set_xlim(0, 78)
ax.set_title("Money raised, by company — the ~$160M headline is the host's on-stage figure",
             color=TXT, fontsize=13, loc="left", pad=14)
ax.set_xlabel("Amount raised ($M)", color=MUT, fontsize=10)
ax.tick_params(colors=TXT, labelsize=11)
for spine in ax.spines.values(): spine.set_visible(False)
ax.xaxis.set_ticks_position("none"); ax.xaxis.grid(True, color="#262a33", lw=0.8)
ax.set_axisbelow(True)
ax.text(0, -0.16, "Source: Alex Yedibalian, LinkedIn recap of The Shortlist September Founder Showcase, 2026-09-28 (published 2026-09-29)",
        transform=ax.transAxes, color=MUT, fontsize=8)
plt.tight_layout()
plt.savefig("/home/user/work/empire-state-hub/public/long-reads/2026-09-28-shortlist-september-founder-showcase/raise-chart.png", bbox_inches="tight", facecolor=BG)
print("saved")
