// The made-up vault: a Vietnamese pastor's study vault, with every date relative to "today" (default 2026-10-14, a
// Wednesday) so each module has something to show. Notes follow the conventions in "Homepage Function Context.md":
// sermons (type: sermon, is_active, date list of [[YYYY-MM-DD]], time, church, bible/verse links), projects
// (Projects/<name>/Home.md + Tasks.md + Meetings + Notes), daily notes with ## Tasks (to-dos and events), Church Roster
// exports (one note per quarter), #countdown lines, church photos in _data_/attachments.
// buildVault({ today, theme }) → { files: [{ path, text?, binary?, ctime, mtime }], adapterFiles: { path: text } }
"use strict";
const fs = require("fs");
const path = require("path");
const { PICTURES } = require("./png");

const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildVault({ today = "2026-10-14", tz = "+07:00", theme = "aurora", homeExtra = {} } = {}) {
	const base = new Date(today + "T00:00:00Z");
	const iso = (n) => new Date(base.getTime() + n * 864e5).toISOString().slice(0, 10);
	const parts = (d) => ({ y: +d.slice(0, 4), m: +d.slice(5, 7), d: +d.slice(8, 10), wd: new Date(d + "T00:00:00Z").getUTCDay() });
	const at = (d, hh = 9, mm = 0) => Date.parse(d + "T" + pad(hh) + ":" + pad(mm) + ":00" + tz);
	const stamp = (d, hh = 9, mm = 0) => { const h12 = hh % 12 || 12; return d + " " + pad(h12) + ":" + pad(mm) + " " + (hh < 12 ? "AM" : "PM"); }; // the Linter's date_created format
	const files = [];
	const add = (p, text, { created = -30, edited = -3, hh, mm } = {}) => {
		const h = hh ?? 8 + (p.length % 9), m = mm ?? (p.length * 7) % 60;
		const ctime = at(iso(created), 7 + (p.length % 5), (p.length * 3) % 60);
		let mtime = at(iso(edited), h, m);
		if (edited === 0) mtime = Math.min(mtime, at(today, 9, 40 - (p.length % 30))); // never after "now" (10:00)
		files.push({ path: p, text, ctime: Math.min(ctime, mtime), mtime });
	};
	const yaml = (fm) => {
		const q = (v) => (typeof v === "string" && (/^[\[\]{}&*!|>'"%@`#,]|: |\s#|^\s|\s$|^(true|false|null|yes|no)$/i.test(v) || /^[-+]?\d+(\.\d+)?$/.test(v) || v === "") ? JSON.stringify(v) : String(v));
		const lines = ["---"];
		for (const [k, v] of Object.entries(fm)) {
			if (v === undefined) continue;
			if (Array.isArray(v)) { lines.push(k + ":"); for (const x of v) lines.push("  - " + q(x)); }
			else lines.push(k + ": " + (v === null ? "" : q(v)));
		}
		lines.push("---", "");
		return lines.join("\n");
	};
	const link = (d) => "[[" + d + "]]";

	// ---------- Sermons ----------
	const WORDS = ["Chúa", "yêu", "thương", "chúng", "ta", "và", "ban", "Thánh", "Linh", "để", "an", "ủi", "dạy", "dỗ", "nhắc", "nhở", "Lời", "Ngài", "là", "sự", "sống", "đời", "đời"];
	const words = (n, seed = 0) => {
		const out = [];
		for (let i = 0; i < n; i++) out.push(WORDS[(i * 7 + seed) % WORDS.length] + ((i + 1) % 14 === 0 ? "." : ""));
		const paras = [];
		for (let i = 0; i < out.length; i += 60) paras.push(out.slice(i, i + 60).join(" "));
		return paras.join("\n\n");
	};
	const sermonBody = (secs) => secs.map(([h, n], k) => "# " + h + "\n\n" + (n ? words(n, k) + "\n" : "")).join("\n");
	const sermon = (name, fm, secs, opts) => add("Spaces/Sermons/" + name + ".md", yaml({ type: "sermon", ...fm, tags: ["sermon"] }) + "\n" + sermonBody(secs), opts);

	sermon("🕊️ Thánh Linh Người Yên Ủi", {
		is_active: true, date: [link(iso(4))], time: ["08:00"], church: ["Trường Xuân"],
		bible: "[[gi-14#26|Giăng 14:26]]", verse: "[[gi-14#16|Giăng 14:16]]", description: "Bồi linh 2026", date_created: stamp(iso(-12), 8, 15)
	}, [["DẪN NHẬP", 180], ["I. Thánh Linh là Đấng Yên Ủi", 520], ["II. Thánh Linh dạy dỗ", 410], ["III. Thánh Linh nhắc nhở", 0], ["KẾT LUẬN", 0]], { created: -12, edited: 0 });
	sermon("🌾 Mùa Gặt Đã Đến", {
		is_active: true, date: [link(iso(4)), link(iso(11))], time: ["15:00", "19:30"], church: ["Tam Dân", "Trường Xuân"],
		bible: "[[mat-9#37|Ma-thi-ơ 9:37]]", description: "Truyền giáo", date_created: stamp(iso(-20), 9, 2)
	}, [["DẪN NHẬP", 240], ["I. Mùa màng thì thật trúng", 610], ["II. Con gặt thì ít", 380], ["III. Hãy cầu xin Chủ mùa gặt", 290], ["KẾT LUẬN", 150]], { created: -20, edited: -1 });
	sermon("⭐ Ánh Sáng Đến Thế Gian", {
		is_active: true, date: [link(iso(71)), link(iso(72))], time: ["19:00", "sáng"], church: ["Tam Dân"],
		bible: "[[gi-1#9|Giăng 1:9]]", verse: "[[es-9#2|Ê-sai 9:2]]", description: "Giáng sinh 2026", date_created: stamp(iso(-3), 21, 40)
	}, [["DẪN NHẬP", 120], ["I. Dân đi trong nơi tối tăm", 260], ["II. Ánh sáng thật", 0], ["III. Hãy bước đi trong sự sáng", 0], ["KẾT LUẬN", 0]], { created: -3, edited: -1 });
	sermon("✝️ Thập Tự Giá và Sự Tha Thứ", {
		is_active: true, church: ["Chi phái 3"], bible: "[[lu-23#34|Lu-ca 23:34]]", date_created: stamp(iso(-5), 20, 5)
	}, [["DẪN NHẬP", 90], ["I. Lời cầu nguyện trên thập tự", 0], ["KẾT LUẬN", 0]], { created: -5, edited: -2 });
	// Inactive with an upcoming date (the Desk variant warns about these).
	sermon("💒 Hôn Nhân Theo Ý Chúa", {
		is_active: false, date: [link(iso(31))], time: ["09:30"], church: ["Trường Xuân"], bible: "[[eph-5#25|Ê-phê-sô 5:25]]", description: "Gia đình", date_created: stamp(iso(-40))
	}, [["DẪN NHẬP", 60], ["I.", 0], ["KẾT LUẬN", 0]], { created: -40, edited: -9 });
	const past = [
		["⛪ Hội Thánh Là Thân Thể Đấng Christ", -3, "Trường Xuân", "1cô-12#27", "1 Cô-rinh-tô 12:27", "Hội Thánh"],
		["🙏 Sự Cầu Nguyện Của Người Công Bình", -17, "Chi phái 1", "gia-5#16", "Gia-cơ 5:16", "Cầu nguyện"],
		["📖 Lời Chúa Là Đèn", -24, "Trường Xuân", "thi-119#105", "Thi Thiên 119:105", "Lời Chúa"],
		["💧 Nước Hằng Sống", -38, "Ban Thanh Niên", "gi-4#14", "Giăng 4:14", "Truyền giáo"],
		["🍞 Bánh Sự Sống", -52, "Chi phái 2", "gi-6#35", "Giăng 6:35", "Lời Chúa"],
		["🕯️ Sự Sáng Của Thế Gian", -66, "Trường Xuân", "mat-5#14", "Ma-thi-ơ 5:14", "Truyền giáo"],
		["⚓ Hy Vọng Vững Chắc", -94, "Tam Dân", "hê-6#19", "Hê-bơ-rơ 6:19", "Hy vọng"],
		["🔥 Lễ Ngũ Tuần", -122, "Trường Xuân", "cong-2#1", "Công vụ 2:1", "Bồi linh Tam Dân"],
		["🌿 Trái Thánh Linh", -150, "Trường Xuân", "ga-5#22", "Ga-la-ti 5:22", "Bồi linh 2026"],
		["🌅 Sự Sống Lại", -175, "Tam Dân", "gi-11#25", "Giăng 11:25", "Phục sinh 2026"],
		["🎄 Ngôi Lời Trở Nên Xác Thịt", -280, "Tam Dân", "gi-1#14", "Giăng 1:14", "Giáng sinh 2025"],
		["👑 Vua Bình An", -300, "Trường Xuân", "es-9#6", "Ê-sai 9:6", "Giáng sinh 2025"]
	];
	past.forEach(([name, n, church, target, disp, topic], k) => {
		const dates = k % 4 === 0 ? [link(iso(n - 7)), link(iso(n))] : [link(iso(n))];
		sermon(name, {
			is_active: false, date: dates, time: dates.length > 1 ? ["08:00", "15:00"] : [k % 3 === 0 ? "15:00" : "08:00"], church: [church],
			bible: "[[" + target + "|" + disp + "]]", description: topic, date_created: stamp(iso(n - 14))
		}, [["DẪN NHẬP", 200 + k * 10], ["I.", 600], ["II.", 500 - k * 15], ["KẾT LUẬN", 200]], { created: n - 14, edited: n });
	});
	add("Spaces/Sermons/Sermons MOC.md", yaml({ date_created: stamp(iso(-400)) }) + "# Sermons\n\n![[Sermons MOC.base]]\n", { created: -400, edited: -60 });
	add("Spaces/Sermons/Sermons MOC.base", "views:\n  - type: table\n    name: All\n  - type: table\n    name: Tam Dân\n  - type: table\n    name: Trường Xuân\n", { created: -400, edited: -60 });

	// ---------- Bible (links from sermons resolve here; Stats groups by book folder) ----------
	const books = { "43 Giăng": ["gi-1", "gi-4", "gi-6", "gi-11", "gi-14"], "40 Ma-thi-ơ": ["mat-5", "mat-9"], "42 Lu-ca": ["lu-23"], "59 Gia-cơ": ["gia-5"], "19 Thi Thiên": ["thi-119"], "44 Công vụ": ["cong-2"], "58 Hê-bơ-rơ": ["hê-6"], "48 Ga-la-ti": ["ga-5"], "23 Ê-sai": ["es-9"], "46 1 Cô-rinh-tô": ["1cô-12"], "49 Ê-phê-sô": ["eph-5"], "01 Sáng Thế Ký": ["sa-1", "sa-2", "sa-3"] };
	for (const [book, chs] of Object.entries(books)) for (const ch of chs) add("Bible/" + book + "/" + ch + ".md", "# " + ch + "\n\n###### 1\nCâu 1.\n", { created: -500, edited: -200 });
	add("Bible/Bible MOC.md", "# Bible\n", { created: -500, edited: -90 });

	// ---------- Projects ----------
	const project = (folder, fm, tasks, extra = {}) => {
		const base = "Projects/" + folder;
		add(base + "/Home.md", yaml({ document_type: "project-dashboard", ...fm }) + "\n# " + (fm.project || folder) + "\n\n" + (extra.home || ""), { created: extra.created ?? -60, edited: extra.edited ?? -1 });
		if (tasks) add(base + "/Tasks.md", yaml({ document_type: "tasks" }) + "# Tasks\n\n" + tasks.join("\n") + "\n", { created: extra.created ?? -60, edited: extra.tasksEdited ?? -2 });
		add(base + "/Meetings/All Meetings.md", "# Meetings\n", { created: extra.created ?? -60, edited: -20 });
		add(base + "/Notes/All Notes.md", "# Notes\n", { created: extra.created ?? -60, edited: -20 });
		for (const [name, n] of extra.meetings || []) add(base + "/Meetings/" + name + ".md", yaml({ document_type: "meeting", date_created: iso(n) }) + "# " + name + "\n\n- Có mặt: ban tổ chức\n", { created: n, edited: Math.min(0, n + 1) });
		for (const [name, n, more] of extra.notes || []) add(base + "/Notes/" + name + ".md", yaml({ document_type: "note", date_created: stamp(iso(n)) }) + "# " + name + "\n\n" + (more || "Ghi chú.") + "\n", { created: n, edited: Math.min(0, n + 2) });
	};
	project("Hội Thánh Trẻ", { is_active: true, project: "Trại Hè Thanh Niên 2026", description: "Kế hoạch trại cho ban thanh niên", date_created: stamp(iso(-60)) }, [
		"- [x] Chọn địa điểm trại 📅 " + iso(-10),
		"- [x] Lập ngân sách",
		"- [ ] Gọi điện cho khu trại xác nhận 📅 " + iso(2),
		"- [ ] Soạn chương trình học Kinh Thánh 📅 " + iso(9),
		"	- [ ] Bài 1: Đức tin",
		"	- [x] Bài 2: Cầu nguyện",
		"- [ ] Đặt xe đưa đón",
		"- [-] Thuê loa (đã có sẵn)"
	], { created: -60, edited: -1, meetings: [["Họp ban tổ chức lần 1", -48], ["Họp ban tổ chức lần 2", -26], ["Họp với khu trại", -9]], notes: [["🏕️ Ý tưởng chủ đề", -30], ["Danh sách trại sinh", -6]] });
	project("Sửa Mái Nhà Thờ", { is_active: true, description: "Thay mái tôn và máng xối trước mùa mưa", date_created: stamp(iso(-30)) }, [
		"- [x] Xin báo giá 📅 " + iso(-12),
		"- [ ] Chọn nhà thầu 📅 " + iso(-1),
		"- [ ] Thông báo cho hội chúng 📅 " + iso(4),
		"- [ ] Quyên góp đợt 2"
	], { created: -30, edited: -3, meetings: [["Họp ban chấp sự về mái", -15]], notes: [["Báo giá", -14]] });
	project("Lễ Cảm Tạ 10 Năm", { is_active: true, project: "Lễ Cảm tạ 10 năm - Tam Dân", description: "Mười năm Hội Thánh Tam Dân: lễ, tiệc và khách mời", date_created: stamp(iso(-45)) }, [
		"- [x] Lập danh sách khách mời",
		"- [ ] Đặt tiệc 📅 " + iso(-2),
		"- [ ] In thiệp mời 📅 " + iso(5),
		"- [ ] Liên hệ ban nhạc 📅 " + iso(12),
		"- [ ] Làm video 10 năm"
	], { created: -45, edited: -2, meetings: [["Họp chuẩn bị lễ", -33], ["Họp phân công", -5]], notes: [["Chương trình lễ", -20, "- Lễ Cảm tạ 10 năm - Tam Dân #countdown [[" + iso(27) + "]]"]] });
	project("Lớp Giáo Lý 2025", { is_active: false, description: "Lớp giáo lý báp-têm khóa 2025", date_created: stamp(iso(-300)) }, [
		"- [x] Soạn giáo trình", "- [x] Dạy 8 bài", "- [x] Lễ báp-têm"
	], { created: -300, edited: -200, meetings: [["Họp giáo viên", -130]], notes: [["Giáo trình", -280]] });
	project("Dịch Sách Tĩnh Nguyện", { is_active: false, description: "Dịch sách tĩnh nguyện cho Hội Thánh", date_created: stamp(iso(-200)) }, null, { created: -200, edited: -150 });
	add("Projects/Projects MOC.md", "# Projects\n", { created: -300, edited: -40 });

	// ---------- Daily notes: to-dos and events under ## Tasks ----------
	const daily = (n, lines, notes = ["- Một ghi chú"]) => {
		const d = iso(n), p = parts(d);
		const title = WEEKDAYS[p.wd] + ", " + p.d + " " + MONTHS[p.m - 1] + " " + p.y;
		add("Daily Notes/" + p.y + "/" + pad(p.m) + "-" + MONTHS[p.m - 1] + "/" + d + ".md",
			yaml({ date_created: stamp(d, 6, 12) }) + "# " + title + "\n\n## Tasks\n" + lines.join("\n") + "\n\n## Notes\n" + notes.join("\n") + "\n",
			{ created: Math.min(0, n), edited: Math.min(0, n + 1), hh: n >= 0 ? 7 : 21 });
	};
	daily(-9, ["- [ ] Gửi báo cáo quý cho Hội đồng #📬 📅 " + iso(-6), "- [x] Thăm bà Hai ✅ " + iso(-9)]);
	daily(-2, ["- [ ] Gửi thư mời hội đồng #📬 📅 " + iso(-1), "- [x] Thăm gia đình anh Tâm ✅ " + iso(-2), "- Họp ban trị sự [time:: 19:30] 📅 " + iso(-2)]);
	daily(-1, ["- [x] Soạn bản tin tuần ✅ " + iso(-1), "- [ ] Mua quà cho trại sinh #🏡 📅 " + iso(3)]);
	daily(0, [
		"- [ ] Chuẩn bị bài giảng Chúa nhật #📖 [duration:: 1h 30m] 🛫 " + iso(0) + " 📅 " + iso(3),
		"	- [x] Đọc chú giải Giăng 14",
		"	- [ ] Viết dàn ý phần III",
		"	- [ ] Tìm minh họa",
		"- [ ] Gọi xe tải #🏡 [duration:: 15m] 📅 " + iso(0),
		"- Họp chấp sự #🔧 [time:: 14:00] [duration:: 2h] 📅 " + iso(2),
		"- Hội đồng giáo phẩm 📅 " + iso(6),
		"- [ ] In bản tin tuần 📅 " + iso(1),
		"- [ ] Đọc sách Mục vụ #📚",
		"- [x] Trả lời thư anh Phúc ✅ " + iso(0),
		"- [-] Đặt phòng hội nghị",
		"- Cầu nguyện cho gia đình chị Lan"
	]);
	daily(1, ["- Tập hát ca đoàn [time:: 19:00] [duration:: 90m] 📅 " + iso(1), "- [ ] Thăm viếng anh Hùng ⏫ 📅 " + iso(1)]);
	for (let n = -40; n < -9; n += 6) daily(n, ["- [x] Việc cũ ✅ " + iso(n)]);
	add("_data_/templates/dailynote_template.md", "## Tasks\n\n## Notes\n", { created: -400, edited: -300 });
	add("_data_/templates/sermon_template.md", yaml({ type: "sermon", is_active: true, date: [], time: [], church: [], bible: "", verse: "" }) + "# DẪN NHẬP\n\n# I.\n\n# KẾT LUẬN\n", { created: -400, edited: -300 });
	add("_data_/templates/note_template.md", "# <% tp.file.title %>\n", { created: -400, edited: -300 });
	add("_data_/templates/project/Project setup.md", yaml({ document_type: "project-dashboard", is_active: true }) + "# Project\n", { created: -400, edited: -300 });

	// ---------- Countdowns (#countdown lines) ----------
	add("Notes/Ngày cần nhớ.md", yaml({ date_created: stamp(iso(-50)) }) + [
		"# Ngày cần nhớ", "",
		"- 🏕️ Trại Thanh Niên #countdown [[" + iso(9) + "]]",
		"- Lễ Cảm tạ 10 năm - Tam Dân #countdown [[" + iso(27) + "]]",
		"- Christmas #countdown [[" + iso(71) + "]]",
		"- 🎆 Tết Nguyên Đán #countdown [[2027-02-06]]",
		"- Hội nghị Mục vụ #countdown [[" + iso(-13) + "]]",
		""
	].join("\n"), { created: -50, edited: -4 });

	// ---------- Church Roster exports (one note per quarter) ----------
	const rosterSample = fs.readFileSync(path.join(__dirname, "fixtures", "Lịch HDCT Quý 4 - 2026.md"), "utf8");
	add("Church Roster/Lịch HDCT Quý 4 - 2026.md", rosterSample, { created: -13, edited: -13 });
	// Last quarter, generated in the same format (rows cycle through the sample's).
	const R1 = rosterSample.split("## LỄ 2")[0].split("\n").filter((l) => /^\| \*\*\d/.test(l)).map((l) => l.split("|").slice(2, -1).map((c) => c.trim()));
	const R2 = rosterSample.split("## LỄ 2")[1].split("\n").filter((l) => /^\| \*\*\d/.test(l)).map((l) => l.split("|").slice(2, -1).map((c) => c.trim()));
	{
		const sundays = [];
		for (let d = new Date(Date.UTC(parts(today).y, 6, 1)); d.getUTCMonth() < 9; d = new Date(d.getTime() + 864e5)) if (d.getUTCDay() === 0) sundays.push(d.toISOString().slice(0, 10));
		const row = (d, cells) => "| **" + d.slice(8, 10) + "/" + d.slice(5, 7) + "** | " + cells.join(" | ") + " |";
		add("Church Roster/Lịch HDCT Quý 3 - " + parts(today).y + ".md", [
			"---", 'roster: "[[Church Roster.roster]]"', "date_created: " + stamp(parts(today).y + "-07-01", 16, 10), "---", "",
			"%% church-roster:start - phần lịch này được tạo lại mỗi lần xuất từ Church Roster %%", "",
			"## LỄ 1", "", "| Ngày | Cầu nguyện | HDCT | Ban hát | Dâng hiến | Tiệc thánh |", "| --- | --- | --- | --- | --- | --- |",
			...sundays.map((d, k) => row(d, R1[k % 12])), "",
			"## LỄ 2", "", "| Ngày | Chia sẻ | HDCT \\| Tôn vinh Chúa |", "| --- | --- | --- |",
			...sundays.map((d, k) => row(d, R2[k % R2.length])), "",
			"%% church-roster:end %%", ""
		].join("\n"), { created: -105, edited: -100 });
	}
	// The second church's roster (its name in the file name, a different table).
	{
		const people = [["MSQN", "CS. Lê Văn Bình", "Ngọc Anh", "Hùng, Mai"], ["CS. Đỗ Văn Khải", "CS. Đỗ Thị Hạnh", "Thanh Tâm", "Tâm, Lan"], ["MSNC", "CS. Lê Văn Bình", "Ngọc Anh", "Phúc, Hà"], ["MSNC", "CS. Đỗ Thị Hạnh", "Thanh Tâm", "Hùng, Lan"], ["MSQN", "CS. Phan Minh Trí", "Ngọc Anh", "Mai, Tâm"]];
		const sundays = [];
		for (let d = new Date(Date.UTC(parts(today).y, 9, 1)); d.getUTCMonth() < 12 && d.getUTCFullYear() === parts(today).y; d = new Date(d.getTime() + 864e5)) if (d.getUTCDay() === 0) sundays.push(d.toISOString().slice(0, 10));
		add("Church Roster/Lịch Trường Xuân Quý 4 - " + parts(today).y + ".md", [
			"---", 'roster: "[[Church Roster.roster]]"', "date_created: " + stamp(iso(-14), 9, 30), "---", "",
			"%% church-roster:start %%", "",
			"## Chúa nhật", "", "| Ngày | Giảng | Hướng dẫn | Đàn | Tiếp tân | Ghi chú |", "| --- | --- | --- | --- | --- | --- |",
			...sundays.map((d, k) => "| " + d.slice(8, 10) + "/" + d.slice(5, 7) + " | " + people[(k + (d === iso(4) ? 0 : 0)) % people.length].join(" | ") + " | " + (d === iso(4) ? "Tiệc thánh" : "") + " |"), "",
			"%% church-roster:end %%", ""
		].join("\n"), { created: -14, edited: -14 });
	}
	add("Church Roster/Church Roster.roster", "{}", { created: -120, edited: -13 });

	// ---------- Other parts of the vault (Vault at a glance, Recently edited) ----------
	const notes = ["Ân điển", "Đức tin và việc làm", "Sự cầu nguyện", "Ghi chú Rô-ma 8", "Hội Thánh đầu tiên", "Lời hứa của Chúa", "Sự tha thứ", "Môn đồ hóa", "Thờ phượng"];
	notes.forEach((n, i) => add("Notes/" + n + ".md", yaml({ date_created: stamp(iso(-50 + i)) }) + "# " + n + "\n\nGhi chú #ghichu\n", { created: -50 + i, edited: -(i * 2 + 1) }));
	for (let i = 0; i < 5; i++) add("Spaces/Books/Sách " + (i + 1) + ".md", "# Sách\n", { created: -90, edited: -10 - i });
	add("Spaces/Books/Books MOC.md", "# Books\n", { created: -90, edited: -30 });
	for (let i = 0; i < 6; i++) add("Spaces/Osermons/Bài giảng " + (i + 1) + ".md", "# Bài giảng\n", { created: -90, edited: -12 - i });
	add("Spaces/Osermons/Osermons MOC.md", "# Other sermons\n", { created: -90, edited: -30 });
	for (let i = 0; i < 2; i++) add("Spaces/Courses/Khóa " + (i + 1) + ".md", "# Khóa học\n", { created: -120, edited: -40 - i });
	for (let i = 0; i < 3; i++) add("Cards/Lịch " + (i + 1) + ".md", "# Lịch\n", { created: -90, edited: -7 - i });
	add("AI/AGENTS.md", "# AI instructions\n", { created: -100, edited: -20 });
	add("AI/rules.md", "# Working rules\n", { created: -100, edited: -20 });

	// ---------- Attachments: church photos (named after the church) and the banner ----------
	for (const name of Object.keys(PICTURES)) files.push({ path: "_data_/attachments/" + name, binary: name, ctime: at(iso(-400)), mtime: at(iso(-400)) });

	// ---------- The homepage ----------
	const home = {
		home_theme: theme,
		banner: "![[Bình minh trên đồi.png]]",
		date_created: stamp(iso(-400)),
		...homeExtra
	};
	add("Homepage.md", yaml(home) + "\n```modular-homepage\n```\n", { created: -400, edited: -1 });

	// Plugin files outside the vault's notes (the Pomodoro's state): a focus already done today.
	const adapterFiles = {
		".obsidian/plugins/modular-homepage/pomodoro.json": JSON.stringify({
			version: 1, character: "tomato", presetId: "classic", sound: true, autoStart: false,
			timer: { phase: "focus", done: 1, status: "idle", endsAt: 0, left: 25 * 6e4, total: 25 * 6e4, finished: null, today: { day: today, count: 2 } },
			session: null, recent: ["Soạn bài giảng Chúa nhật", "Đọc sách Mục vụ"]
		}, null, "\t")
	};
	return { files, adapterFiles };
}

// The attachments' bytes (painted once, then cached next to this file).
function binaryFor(name) {
	const dir = path.join(__dirname, ".cache", "attachments");
	const file = path.join(dir, name);
	if (fs.existsSync(file)) return fs.readFileSync(file);
	fs.mkdirSync(dir, { recursive: true });
	const buf = PICTURES[name]();
	fs.writeFileSync(file, buf);
	return buf;
}

module.exports = { buildVault, binaryFor };
