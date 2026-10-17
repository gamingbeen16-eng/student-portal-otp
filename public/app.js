// Client Logic for Student Portal OTP Generator & Authenticator
let demoStudents = [];
let currentPhone = '';
let currentStudentId = '';
let currentOtpCode = '';
let countdownInterval = null;
let remainingSeconds = 300;

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  fetchPortalConfig();
  setupOtpInputHandlers();
});

// Log message to virtual telemetry console
function addLog(text, type = 'info') {
  const terminal = document.getElementById('terminalLogs');
  const line = document.createElement('div');
  line.className = `terminal-line line-${type}`;
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${text}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearLogs() {
  const terminal = document.getElementById('terminalLogs');
  terminal.innerHTML = '<div class="terminal-line line-info">[Console cleared] Ready.</div>';
}

// Fetch backend status and student directory
async function fetchPortalConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    
    if (data.keyPreview) {
      document.getElementById('apiKeyDisplay').textContent = data.keyPreview;
      addLog(`Connected to MiniMoth Provider with API Key ${data.keyPreview}`, 'success');
    }

    if (data.demoStudents && data.demoStudents.length > 0) {
      demoStudents = data.demoStudents;
      renderDemoStudents(demoStudents);
      // Auto-select first student
      selectDemoStudent(demoStudents[0].id);
    }
  } catch (err) {
    addLog(`Failed to fetch portal configuration: ${err.message}`, 'error');
  }
}

// Render student selection chips
function renderDemoStudents(students) {
  const container = document.getElementById('presetStudentsList');
  container.innerHTML = '';

  students.forEach((student, index) => {
    const chip = document.createElement('div');
    chip.className = `student-chip ${index === 0 ? 'active' : ''}`;
    chip.id = `chip-${student.id}`;
    chip.onclick = () => selectDemoStudent(student.id);

    chip.innerHTML = `
      <div class="chip-info">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #38bdf8); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
          ${student.name.charAt(0)}
        </div>
        <div>
          <div class="chip-name">${student.name}</div>
          <div class="chip-sub">${student.id} • ${student.phone}</div>
        </div>
      </div>
      <span class="chip-tag">${student.program.split(' ')[0]}</span>
    `;

    container.appendChild(chip);
  });
}

// Choose a student profile to quickly autofill form
function selectDemoStudent(studentId) {
  const student = demoStudents.find(s => s.id === studentId);
  if (!student) return;

  document.querySelectorAll('.student-chip').forEach(c => c.classList.remove('active'));
  const activeChip = document.getElementById(`chip-${studentId}`);
  if (activeChip) activeChip.classList.add('active');

  document.getElementById('phoneInput').value = student.phone;
  document.getElementById('studentIdInput').value = student.id;
  currentPhone = student.phone;
  currentStudentId = student.id;

  addLog(`Selected Student Profile: ${student.name} (${student.id}, ${student.phone})`, 'info');
}

// Handle sending OTP
async function handleSendOtp(event) {
  event.preventDefault();
  const phone = document.getElementById('phoneInput').value.trim();
  const studentId = document.getElementById('studentIdInput').value.trim();

  if (!phone) {
    alert('Please enter a phone number.');
    return;
  }

  currentPhone = phone;
  currentStudentId = studentId;

  const btn = document.getElementById('btnSendOtp');
  const btnText = document.getElementById('btnSendText');
  const spinner = document.getElementById('btnSendSpinner');

  btn.disabled = true;
  btnText.textContent = 'Contacting MiniMoth API...';
  spinner.style.display = 'inline-block';

  addLog(`Initiating OTP dispatch request to MiniMoth for ${phone}...`, 'info');

  try {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, studentId })
    });

    const data = await res.json();

    if (data.success) {
      currentOtpCode = data.previewCode;
      
      // Update UI Telemetry
      if (data.isLiveDelivered) {
        addLog(`✅ Live OTP sent successfully via MiniMoth API! OTP ID: ${data.otpId}`, 'success');
      } else {
        addLog(`⚡ MiniMoth API processed: ${data.note || 'Code generated'} (Status: ${data.apiStatus})`, 'warn');
      }

      // Display OTP preview in the telemetry card for convenience
      document.getElementById('liveOtpCard').style.display = 'block';
      document.getElementById('liveOtpDigits').textContent = currentOtpCode;
      addLog(`Generated 6-Digit OTP: ${currentOtpCode}`, 'info');

      // Switch to Step 2 (Verification)
      document.getElementById('displayTargetPhone').textContent = currentPhone;
      switchStep('stepVerifyOtp');
      startTimer(300);

      // Focus first OTP box
      setTimeout(() => {
        const firstBox = document.querySelector('.otp-box');
        if (firstBox) firstBox.focus();
      }, 100);

    } else {
      addLog(`❌ Failed to send OTP: ${data.error}`, 'error');
      alert(`Error sending OTP: ${data.error}`);
    }
  } catch (err) {
    addLog(`Network/Server Error: ${err.message}`, 'error');
    alert(`Failed to send OTP. Check console.`);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Generate & Dispatch OTP';
    spinner.style.display = 'none';
  }
}

// Switch between Step 1 and Step 2
function switchStep(stepId) {
  document.getElementById('stepRequestOtp').style.display = (stepId === 'stepRequestOtp') ? 'block' : 'none';
  document.getElementById('stepVerifyOtp').style.display = (stepId === 'stepVerifyOtp') ? 'block' : 'none';

  if (stepId === 'stepRequestOtp') {
    document.getElementById('formHeading').textContent = 'Student Authentication';
    document.getElementById('formSubheading').textContent = 'Sign in with your registered phone number or university roll number to receive a secure OTP.';
    clearOtpBoxes();
  } else {
    document.getElementById('formHeading').textContent = 'Two-Factor Verification';
    document.getElementById('formSubheading').textContent = 'Enter the 6-digit verification code dispatched to your registered phone.';
  }
}

// Handle OTP boxes navigation and pasting
function setupOtpInputHandlers() {
  const boxes = document.querySelectorAll('.otp-box');

  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      box.value = val;

      if (val && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      }

      checkAndAutoSubmit();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pasteData.replace(/\D/g, '').slice(0, 6);
      
      digits.split('').forEach((d, i) => {
        if (boxes[i]) boxes[i].value = d;
      });

      if (digits.length > 0) {
        const nextIdx = Math.min(digits.length, boxes.length - 1);
        boxes[nextIdx].focus();
      }

      checkAndAutoSubmit();
    });
  });
}

function clearOtpBoxes() {
  document.querySelectorAll('.otp-box').forEach(box => box.value = '');
}

function autoFillOtp() {
  if (!currentOtpCode) return;
  const boxes = document.querySelectorAll('.otp-box');
  currentOtpCode.split('').forEach((d, i) => {
    if (boxes[i]) boxes[i].value = d;
  });
  checkAndAutoSubmit();
}

function getEnteredOtp() {
  let code = '';
  document.querySelectorAll('.otp-box').forEach(box => {
    code += box.value.trim();
  });
  return code;
}

function checkAndAutoSubmit() {
  const code = getEnteredOtp();
  if (code.length === 6) {
    handleVerifyOtp(new Event('submit'));
  }
}

// Timer countdown
function startTimer(seconds) {
  clearInterval(countdownInterval);
  remainingSeconds = seconds;
  const timerText = document.getElementById('timerText');
  const btnResend = document.getElementById('btnResend');
  btnResend.disabled = true;

  updateTimerDisplay();

  countdownInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(countdownInterval);
      timerText.textContent = 'Expired';
      btnResend.disabled = false;
      addLog('OTP code has expired. Please request a new code.', 'warn');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerText = document.getElementById('timerText');
  const m = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const s = (remainingSeconds % 60).toString().padStart(2, '0');
  timerText.textContent = `${m}:${s}`;
}

// Resend OTP
function handleResendOtp() {
  clearOtpBoxes();
  handleSendOtp(new Event('submit'));
}

// Handle OTP Verification
async function handleVerifyOtp(event) {
  if (event && event.preventDefault) event.preventDefault();

  const code = getEnteredOtp();
  if (code.length !== 6) {
    alert('Please enter all 6 digits of the OTP.');
    return;
  }

  const btn = document.getElementById('btnVerifyOtp');
  const btnText = document.getElementById('btnVerifyText');
  const spinner = document.getElementById('btnVerifySpinner');

  btn.disabled = true;
  btnText.textContent = 'Verifying with MiniMoth...';
  spinner.style.display = 'inline-block';

  addLog(`Verifying OTP ${code} for ${currentPhone}...`, 'info');

  try {
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: currentPhone,
        code: code,
        studentId: currentStudentId
      })
    });

    const data = await res.json();

    if (data.success) {
      addLog(`🎉 Authentication Success via ${data.verificationMethod}!`, 'success');
      clearInterval(countdownInterval);

      // Render Student Portal Dashboard
      renderDashboard(data.student, data.verificationMethod);
    } else {
      addLog(`❌ Verification Failed: ${data.error}`, 'error');
      alert(data.error);
    }
  } catch (err) {
    addLog(`Verification request error: ${err.message}`, 'error');
    alert('Failed to verify OTP. Please try again.');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Verify OTP & Open Student Portal';
    spinner.style.display = 'none';
  }
}

// Display Student Dashboard after successful authentication
function renderDashboard(student, method) {
  // Hide Auth section, show Dashboard
  document.getElementById('authSection').style.display = 'none';
  const dash = document.getElementById('portalDashboard');
  dash.style.display = 'block';

  // Fill Profile Data
  document.getElementById('dashAvatar').src = student.avatar;
  document.getElementById('dashName').textContent = student.name;
  document.getElementById('dashRoll').textContent = student.id;
  document.getElementById('dashProgram').textContent = student.program;
  document.getElementById('dashSem').textContent = student.semester;
  document.getElementById('dashGpa').textContent = student.gpa;
  document.getElementById('dashAuthMethod').textContent = method || 'MiniMoth 2FA';

  // Populate Enrolled Courses
  const courseTableBody = document.getElementById('courseTableBody');
  courseTableBody.innerHTML = '';
  if (student.courses && student.courses.length > 0) {
    student.courses.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: 'Space Grotesk', monospace; color: #a5b4fc; font-weight: 600;">${c.code}</td>
        <td style="font-weight: 500;">${c.name}</td>
        <td>
          <span style="color: #34d399; font-weight: 600;">${c.attendance}</span>
        </td>
        <td>
          <span style="background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 4px; font-weight: 700; color: #c7d2fe;">
            ${c.grade}
          </span>
        </td>
      `;
      courseTableBody.appendChild(tr);
    });
  }

  // Populate Announcements
  const announcementsList = document.getElementById('announcementsList');
  announcementsList.innerHTML = '';
  if (student.announcements && student.announcements.length > 0) {
    student.announcements.forEach(a => {
      const item = document.createElement('div');
      item.className = 'announcement-item';
      item.innerHTML = `
        <span class="announcement-tag">${a.tag}</span>
        <div class="announcement-title">${a.title}</div>
        <div class="announcement-date">📅 ${a.date}</div>
      `;
      announcementsList.appendChild(item);
    });
  }

  addLog(`Student session active for ${student.name} (${student.id})`, 'success');
}

// Logout back to login screen
function handleLogout() {
  document.getElementById('portalDashboard').style.display = 'none';
  document.getElementById('authSection').style.display = 'grid';
  switchStep('stepRequestOtp');
  clearOtpBoxes();
  document.getElementById('liveOtpCard').style.display = 'none';
  addLog('User logged out. Session terminated.', 'info');
}
