(() => {
  if (document.getElementById('shelley-inject-root')) return;
  const {cwd, previewBase} = document.currentScript.dataset;
  if (!cwd || !previewBase) throw new Error('Shelley Inject requires data-cwd and data-preview-base.');
  const host = document.createElement('div');
  host.id = 'shelley-inject-root';
  document.body.append(host);
  const chatKey = 'shelley-inject:chat:v1:' + location.origin + location.pathname;
  let chatPath = localStorage.getItem(chatKey);
  let creatingChat = null;
  const originalMargin = document.body.style.marginRight;
  const root = host.attachShadow({mode: 'open'});
  const bars = count => Array.from({length:count}, (_, i) => `<span style="--i:${i};height:2px"></span>`).join('');
  root.innerHTML = `<style>
    :host{all:initial;font:13px system-ui,sans-serif;color:#e9eef1}*{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #49535f;background:#293440;color:#e9eef1;border-radius:6px;padding:6px 11px}button:hover{background:#3a4958}button:disabled{opacity:.45;cursor:default}button[aria-pressed=true]{background:#daf49a;color:#263317;border-color:#daf49a}.bar{position:fixed;top:0;left:0;right:0;height:46px;z-index:2147483647;background:#18232c;display:flex;align-items:center;gap:10px;padding:0 18px;box-shadow:0 1px 8px #0003}.logo{font-weight:750;letter-spacing:-.3px}.badge{font-size:10px;letter-spacing:.08em;color:#a3b0ba;border:1px solid #45515b;border-radius:4px;padding:2px 5px}.hint{color:#aebbc5;margin-left:4px;flex:1}.count{color:#d7efa9}.panel{position:fixed;right:16px;top:62px;bottom:16px;width:470px;max-width:calc(100vw - 32px);border:1px solid #42515a;border-radius:12px;background:#f8fafb;z-index:2147483646;box-shadow:0 14px 55px #13222d33;overflow:hidden}.panel[hidden]{display:none}iframe{width:100%;flex:1;min-height:0;border:0}.panel{display:flex;flex-direction:column}.chat-header{color:#243329;display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #dce3e8;font-size:12px}.chat-header span{flex:1}.chat-header a{color:#537330}.chat-header button{background:none;border:0;color:#243329;padding:0 6px;font-size:20px}.status{color:#d7efa9;max-width:250px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}@media(max-width:700px){.panel{left:0;right:0;top:50dvh;bottom:0;width:100%;max-width:none;border-radius:12px 12px 0 0}.status{display:none}}.hover,.mark{position:fixed;pointer-events:none;z-index:2147483645;border:2px solid #729c31;border-radius:3px;background:#b9e57820}.hover{border-color:#3b82f6;background:#3b82f615}.hover[hidden]{display:none}.tag{position:absolute;left:-2px;top:-23px;background:#2563eb;color:white;font:11px system-ui;padding:3px 6px;border-radius:3px;white-space:nowrap}.mark:before{content:attr(data-n);position:absolute;top:-10px;left:-10px;border-radius:20px;min-width:20px;height:20px;text-align:center;background:#608423;color:white;font:12px/20px system-ui}@media(max-width:620px){.hint,.badge{display:none}.logo{flex:1}.bar{padding:0 10px;gap:6px}}
    .launcher{position:fixed;right:18px;bottom:18px;z-index:2147483646;display:flex;align-items:center;gap:9px;border-radius:24px;padding:11px 15px;background:#18232c;border-color:#45535d;box-shadow:0 4px 18px #13222d22;font-size:12px}.launcher[hidden]{display:none}.work-dot{width:7px;height:7px;border-radius:50%;background:#92a1ac}.launcher.working .work-dot{background:#d7efa9;animation:work-pulse 1.3s ease-in-out infinite}.launcher.attention .work-dot{background:#efb66c}@keyframes work-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.launcher.working .work-dot{animation:none}}
    #voice-comment{display:inline-flex;align-items:center;gap:8px}.voice-wave,.activity-wave{height:20px;align-items:center;justify-content:center;gap:1px;flex:none}.voice-wave{display:inline-flex;width:47px}.voice-wave[hidden],.activity-wave{display:none}.activity-wave{width:23px}.voice-wave span,.activity-wave span{width:2px;flex:none;max-height:20px;background:#dc2626;border-radius:1px;transition:height 80ms linear}.launcher.recording .activity-wave,.launcher.transcribing .activity-wave{display:inline-flex}.launcher.recording .work-dot,.launcher.transcribing .work-dot{display:none}.voice-wave.busy span,.launcher.transcribing .activity-wave span{height:18px!important;animation:voice-busy .9s ease-in-out calc(var(--i)*-70ms) infinite}@keyframes voice-busy{0%,100%{transform:scaleY(.2)}50%{transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){.voice-wave.busy span,.launcher.transcribing .activity-wave span{animation:none;transform:scaleY(.5)}}.comment-actions{flex-wrap:wrap}.comment-actions.voice-active .send-comment{display:none}
    .comment-popup{position:fixed;z-index:2147483647;width:340px;max-width:calc(100vw - 24px);padding:16px;border:1px solid #cbd5de;border-radius:12px;background:white;color:#25323d;box-shadow:0 12px 40px #13222d33}.comment-popup[hidden]{display:none}.comment-popup label{display:block;font-weight:650;font-size:14px;margin-bottom:10px}.comment-popup textarea{width:100%;height:94px;resize:vertical;padding:10px;border:1px solid #cbd5de;border-radius:7px;font:14px/1.5 system-ui;color:#25323d;background:#fff;outline-color:#729c31}.comment-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.comment-actions button{background:#eef2f4;color:#25323d;border-color:#d9e0e4}.comment-actions .send-comment{background:#344b3b;color:white;border-color:#344b3b}.comment-error{color:#a33;font-size:12px;margin-top:6px}.send-comment:disabled{opacity:.5;cursor:default}
    </style><div class="bar"><span class="logo">✳ Shelley Inject</span><span class="badge">PROTOTYPE</span><button id="pick" aria-pressed="false">⌖ Select</button><span class="count">0 selected</span><span class="hint">Point at the page. Tell Shelley what to change.</span><span class="status" role="status"></span><button id="reset-preview" disabled>Reset preview</button><button id="clear">Clear</button></div><div class="hover" hidden><span class="tag"></span></div><div class="marks"></div><button id="chat" class="launcher" aria-label="Open this page’s Shelley chat" aria-expanded="false" aria-controls="shelley-chat-panel"><span class="work-dot" aria-hidden="true"></span><span class="activity-wave" aria-hidden="true">${bars(8)}</span><span class="work-label" aria-live="polite">Shelley</span><span aria-hidden="true">↗</span></button><div class="panel" id="shelley-chat-panel" hidden><div class="chat-header"><span>Chat for this page</span><button id="new-chat" style="font-size:12px" type="button">New chat</button><a id="separate" target="_blank" rel="noopener">Open separately ↗</a><button id="close" aria-label="Close chat">×</button></div><iframe title="Shelley chat"></iframe></div><form class="comment-popup" hidden aria-label="Comment on selection"><label for="comment">What should change?</label><textarea id="comment" placeholder="Make these icons smaller…"></textarea><div class="selection-note" role="status" hidden style="font-size:12px;color:#886522;margin-top:6px"></div><div class="voice-status" role="status" style="font-size:12px;color:#587447;min-height:18px;margin-top:6px"></div><div class="comment-error" role="status"></div><div class="comment-actions"><button id="voice-comment" type="button"><span class="voice-wave" aria-hidden="true" hidden>${bars(16)}</span><span class="voice-label">🎙 Record voice</span></button><button id="cancel-comment" type="button">Cancel</button><button class="send-comment" type="submit" disabled>Send to Shelley ↗</button></div></form>`;
  document.body.style.paddingTop = `${parseFloat(getComputedStyle(document.body).paddingTop) + 46}px`;
  const $ = s => root.querySelector(s);
  const selected = [];
  const selectionSnapshots = new WeakMap();
  let voice = null;
  let submittingComment = false;
  let picking = false, hovered = null;
  let selectionFrame = null;
  const panel = $('.panel'), frame = $('iframe');
  function setActivity(label, working = false, attention = false) {
    const launcher = $('#chat');
    const recording = voice?.recorder?.state === 'recording';
    if (recording) { label = 'Shelley listening…'; working = false; attention = false; }
    launcher.classList.toggle('recording', !!recording);
    launcher.classList.toggle('transcribing', label === 'Shelley transcribing…');
    launcher.classList.toggle('working', working);
    launcher.classList.toggle('attention', attention);
    if ($('.work-label').textContent !== label) $('.work-label').textContent = label;
  }
  let activityPending = false;
  async function updateActivity() {
    if (!chatPath || activityPending || document.hidden) return;
    activityPending = true;
    const path = chatPath;
    try {
      const response = await fetch('/api/conversation-by-slug/' + encodeURIComponent(path.slice(3)));
      if (path !== chatPath) return;
      if (!response.ok) { setActivity('Shelley · unavailable', false, true); return; }
      const conversation = await response.json();
      const queue = typeof conversation.queued_messages === 'string' ? JSON.parse(conversation.queued_messages) : conversation.queued_messages || [];
      const transcribing = queue.some(item => item.kind === 'transcription' && item.state === 'working');
      const working = conversation.agent_working || queue.some(item => item.state !== 'failed');
      const failed = queue.some(item => item.state === 'failed');
      setActivity(transcribing ? 'Shelley transcribing…' : working ? 'Shelley working…' : failed ? 'Shelley · needs attention' : 'Shelley · ready', !!working, failed);
    } catch {
      setActivity('Shelley · reconnecting', false, true);
    } finally {
      activityPending = false;
    }
  }
  const activityTimer = setInterval(updateActivity, 2000);
  document.addEventListener('visibilitychange', updateActivity);
  updateActivity();
  function saveChat(path) {
    if (!path?.startsWith('/c/')) return;
    chatPath = path;
    localStorage.setItem(chatKey, path);
    $('#separate').href = path;
    updateActivity();
  }
  async function ensureChat(fresh = false) {
    if (creatingChat) return creatingChat;
    if (frame.hasAttribute('src') && !fresh) return;
    $('#new-chat').disabled = true;
    $('.status').textContent = 'Starting a fresh page chat…';
    creatingChat = (async () => {
      try {
        if (chatPath && !fresh) {
          const saved = await fetch('/api/conversation-by-slug/' + encodeURIComponent(chatPath.slice(3)));
          if (saved.ok) {
            frame.src = chatPath;
            $('#separate').href = chatPath;
            $('.status').textContent = 'Continuing this page’s chat';
            return;
          }
          if (saved.status !== 404) throw new Error('Could not reopen the page chat.');
        }
        const response = await fetch('/api/conversations/draft', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'X-Shelley-Request': '1'},
          body: JSON.stringify({draft: '', cwd})
        });
        if (!response.ok) throw new Error('Could not create chat (' + response.status + ').');
        const conversation = await response.json();
        if (!conversation.conversation_id) throw new Error('Missing conversation ID.');
        saveChat('/c/' + encodeURIComponent(conversation.conversation_id));
        frame.src = chatPath;
        $('.status').textContent = 'Fresh chat · saved for this page';
      } catch (error) {
        $('.status').textContent = error.message;
        return false;
      } finally {
        $('#new-chat').disabled = false;
        creatingChat = null;
      }
    })();
    return creatingChat;
  }
  $('#new-chat').onclick = () => { showPanel(true); ensureChat(true); };
  function showPanel(open) {
    panel.hidden = !open;
    if (open) ensureChat();
    $('#chat').hidden = open;
    document.body.style.marginRight = open && window.innerWidth > 700 ? '486px' : originalMargin;
    redraw();
    $('#chat').setAttribute('aria-expanded', String(open));
  }
  function pick(on) {
    picking = on;
    $('#pick').setAttribute('aria-pressed', String(on));
    $('#pick').textContent = on ? '⌖ Selecting · Esc' : '⌖ Select';
    $('.hint').textContent = on ? 'Tap again to expand. Shift-click to add. Esc to finish.' : 'Point at the page. Tell Shelley what to change.';
    if (!on) { hovered = null; $('.hover').hidden = true; }
    followSelectionGeometry();
  }
  function selector(el) {
    if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + CSS.escape(el.id);
    const parts = [];
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      let part = node.tagName.toLowerCase();
      const peers = [...node.parentElement.children].filter(e => e.tagName === node.tagName);
      if (peers.length > 1) part += `:nth-of-type(${peers.indexOf(node) + 1})`;
      parts.unshift(part);
      const path = parts.join(' > ');
      if (document.querySelectorAll(path).length === 1) return path;
    }
    return 'body > ' + parts.join(' > ');
  }
  function liveSelection(el) {
    if (el.isConnected) return el;
    const saved = selectionSnapshots.get(el);
    if (!saved) return null;
    const matches = document.querySelectorAll(saved.selector);
    const current = matches.length === 1 ? matches[0] : null;
    return current && current.tagName.toLowerCase() === saved.tag && !current.contains(host) ? current : null;
  }
  function snapshot(el) {
    const current = liveSelection(el);
    if (!current) throw new Error('That selection changed and cannot be matched. Tap its current version, then retry. Your comment is kept.');
    if (current !== el) {
      const index = selected.indexOf(el);
      if (index >= 0) selected[index] = current;
      el = current;
    }
    const r = el.getBoundingClientRect(), css = getComputedStyle(el);
    const safe = el.cloneNode(true);
    for (const input of [safe, ...safe.querySelectorAll('input,textarea,select,[contenteditable]')]) {
      if (input.matches('input,textarea,select,[contenteditable]')) { input.removeAttribute('value'); input.textContent = ''; }
    }
    const captured = {selector: selector(el), tag: el.tagName.toLowerCase(), text: (el.innerText || '').slice(0, 400), html: safe.outerHTML.slice(0, 2200), bounds: {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}, styles: {margin:css.margin,padding:css.padding,gap:css.gap,display:css.display,fontSize:css.fontSize,color:css.color,backgroundColor:css.backgroundColor,border:css.border,borderRadius:css.borderRadius,fontWeight:css.fontWeight,fontFamily:css.fontFamily,lineHeight:css.lineHeight,width:css.width,height:css.height,position:css.position,transform:css.transform,opacity:css.opacity,boxShadow:css.boxShadow}};
    selectionSnapshots.set(el, captured);
    return captured;
  }
  function commentPopup(event) {
    const popup = $('.comment-popup');
    popup.hidden = false;
    popup.style.left = Math.max(12, Math.min(event.clientX + 12, innerWidth - 352)) + 'px';
    popup.style.top = Math.max(58, Math.min(event.clientY + 12, innerHeight - 300)) + 'px';
    popup.querySelector('label').textContent = selected.length > 1 ? `Comment on ${selected.length} elements` : 'What should change?';
    $('.comment-error').textContent = '';
    $('#comment').focus();
    ensureChat();
  }
  async function sendComment(event, capture = null) {
    event?.preventDefault();
    const comment = $('#comment').value.trim();
    if (submittingComment || !selected.length || (capture ? capture.discarded : (!comment || voice || $('.send-comment').disabled))) return;
    const selectionForSend = [...selected];
    submittingComment = true;
    syncVoiceControls();
    const button = $('.send-comment');
    button.disabled = true;
    button.textContent = 'Sending…';
    $('.comment-error').textContent = '';
    $('#voice-comment').disabled = true;
    try {
      if (await ensureChat() === false) throw new Error($('.status').textContent);
      if (!chatPath) throw new Error('Could not create a page chat. Try New chat.');
      const targetResponse = await fetch('/api/conversation-by-slug/' + encodeURIComponent(chatPath.slice(3)));
      if (!targetResponse.ok) throw new Error('Could not reopen your page chat: ' + (await targetResponse.text()).slice(0, 160));
      const target = await targetResponse.json();
      const chatDocument = frame.contentDocument;
      const input = chatDocument?.querySelector('textarea[data-testid="message-input"]');
      const active = chatDocument?.URL ? new URL(chatDocument.URL).pathname : '';
      const isTarget = active === '/c/' + target.conversation_id || (target.slug && active === '/c/' + target.slug);
      if ((target.is_draft && target.draft?.trim()) || (isTarget && input?.value.trim())) {
        throw new Error('Your chat has an unsent draft. Send or clear it first.');
      }
      if (capture) {
        if (capture.discarded) return;
        if (!capture.path) {
          const extension = capture.clip.type.includes('mp4') ? 'mp4' : 'webm';
          const filename = 'inject-voice-' + Date.now() + '.' + extension;
          const upload = await fetch('/api/upload/raw?filename=' + encodeURIComponent(filename), {
            method: 'POST', headers: {'Content-Type': capture.clip.type || 'application/octet-stream'}, body: capture.clip
          });
          if (!upload.ok) throw new Error('Audio upload failed: ' + (await upload.text()).slice(0, 160));
          capture.path = (await upload.json()).path;
          if (!capture.path) throw new Error('Audio upload did not return a path.');
        }
        if (capture.discarded) return;
      }
      const payload = {page: location.href, title: document.title, elements: selectionForSend.map(snapshot), preview: {
        base: previewBase, page: location.pathname, css: previewStyle.textContent,
        instructions: 'For live previews, POST JSON to /css with {page,css}, or /html with {page,selector,html,mode}. CSS replaces the preview stylesheet; HTML modes are inner, append, prepend. POST /reset to undo overlays. Prefer these temporary injections over source edits until asked to keep the change.'
      }};
      let text = comment + '\n\nSelected page context (Shelley Inject):\n```json\n' + JSON.stringify(payload,null,2) + '\n```\n';
      if (capture) text = '/transcription ' + capture.path + '\n' + text.trim();
      const submission = await fetch('/api/conversation/' + encodeURIComponent(target.conversation_id) + '/chat', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: text})
      });
      if (!submission.ok) throw new Error('Shelley could not accept the comment: ' + (await submission.text()).slice(0, 240));
      if (!isTarget || !input) frame.src = '/c/' + encodeURIComponent(target.conversation_id);
      discardVoice();
      $('.comment-popup').hidden = true;
      $('#comment').value = '';
      selected.length = 0;
      redraw();
      setActivity(capture ? 'Shelley transcribing…' : 'Shelley working…', true);
      updateActivity();
      $('.status').textContent = capture ? 'Voice sent · Shelley is transcribing' : 'Submitted to your page chat';
    } catch (error) {
      $('.comment-error').textContent = error.message;
    } finally {
      submittingComment = false;
      button.textContent = 'Send to Shelley ↗';
      syncVoiceControls();
    }
  }
  function syncVoiceControls() {
    $('.send-comment').disabled = submittingComment || !!voice || !$('#comment').value.trim();
    $('#voice-comment').disabled = submittingComment || (!!voice && !voice.clip && voice.recorder?.state !== 'recording');
    const recording = voice?.recorder?.state === 'recording';
    const busy = !!voice && (submittingComment || (voice.sendOnStop && !voice.clip));
    $('.voice-label').textContent = busy ? 'Sending…' : voice?.clip ? 'Retry voice send' : recording ? '■ Stop & send' : '🎙 Record voice';
    $('.voice-wave').hidden = !recording && !busy;
    $('.voice-wave').classList.toggle('busy', busy);
    $('.comment-actions').classList.toggle('voice-active', !!voice);
    if (recording) setActivity('Shelley listening…');
  }
  function discardVoice() {
    const capture = voice;
    voice = null;
    if (capture) {
      capture.discarded = true;
      clearInterval(capture.timer);
      capture.stopMeter?.();
      capture.stopMeter = null;
      if (capture.recorder?.state === 'recording') capture.recorder.stop();
      capture.stream?.getTracks().forEach(track => track.stop());
    }
    $('.voice-status').textContent = '';
    syncVoiceControls();
    setActivity('Shelley');
    updateActivity();
  }
  async function recordVoice() {
    if (submittingComment) return;
    if (voice?.clip) { await sendComment(null, voice); return; }
    if (voice?.recorder?.state === 'recording') {
      voice.sendOnStop = true;
      $('#voice-comment').disabled = true;
      voice.recorder.stop();
      syncVoiceControls();
      setActivity('Shelley sending voice…', true);
      return;
    }
    if (voice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      $('.comment-error').textContent = 'Microphone recording requires a supported browser over HTTPS.';
      return;
    }
    if (frame.contentDocument?.defaultView?.__SHELLEY_INIT__?.transcription_available === false) {
      $('.comment-error').textContent = 'Shelley has no transcription route configured.';
      return;
    }
    const capture = {chunks: [], discarded: false, sendOnStop: false};
    voice = capture;
    $('#voice-comment').disabled = true;
    $('.send-comment').disabled = true;
    $('.comment-error').textContent = '';
    $('.voice-status').textContent = 'Waiting for microphone permission…';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      capture.stream = stream;
      if (capture.discarded) { stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : {});
      capture.recorder = recorder;
      recorder.ondataavailable = event => { if (event.data.size) capture.chunks.push(event.data); };
      recorder.onstop = async () => {
        clearInterval(capture.timer);
        capture.stopMeter?.();
        capture.stopMeter = null;
        stream.getTracks().forEach(track => track.stop());
        if (capture.discarded) return;
        if (!capture.sendOnStop) { discardVoice(); return; }
        capture.clip = new Blob(capture.chunks, {type: recorder.mimeType});
        if (!capture.clip.size || capture.clip.size > 25 * 1024 * 1024) {
          discardVoice();
          $('.comment-error').textContent = 'Recording is empty or exceeds 25 MB. Please record again.';
          return;
        }
        $('.voice-status').textContent = 'Uploading voice comment to Shelley…';
        await sendComment(null, capture);
        if (voice === capture) $('.voice-status').textContent = 'Recording kept here; retry sending or cancel.';
      };
      recorder.onerror = () => { discardVoice(); $('.comment-error').textContent = 'Microphone recording failed. Please try again.'; };
      recorder.start();
      capture.stopMeter = startMicMeter(stream);
      capture.startedAt = Date.now();
      const tick = () => {
        const seconds = Math.floor((Date.now() - capture.startedAt) / 1000);
        $('.voice-status').textContent = `Recording · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      };
      tick();
      capture.timer = setInterval(tick, 1000);
      syncVoiceControls();
    } catch (error) {
      if (capture.discarded) return;
      discardVoice();
      $('.comment-error').textContent = error.name === 'NotAllowedError' ? 'Microphone access denied. Allow it in your browser and try again.' : error.message;
    }
  }
  function startMicMeter(stream) {
    if (typeof AudioContext !== 'function') return () => {};
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    if (context.state === 'suspended') void context.resume();
    const samples = new Uint8Array(analyser.fftSize);
    const micBars = [...root.querySelectorAll('.voice-wave span')];
    const activityBars = [...root.querySelectorAll('.activity-wave span')];
    let levels = micBars.map(() => 0.15);
    let animation;
    function draw() {
      analyser.getByteTimeDomainData(samples);
      levels = levels.map((level, index) => {
        const start = Math.floor(index / micBars.length * samples.length);
        const end = Math.floor((index + 1) / micBars.length * samples.length);
        let peak = 0;
        for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i] - 128));
        const target = Math.max(0.1, Math.min(1, Math.pow(peak / 128, 0.65) * 2.3));
        return target >= level ? target : Math.max(0.1, level * 0.8 + target * 0.2);
      });
      micBars.forEach((bar, i) => { bar.style.height = Math.max(2, levels[i] * 20) + 'px'; });
      activityBars.forEach((bar, i) => { bar.style.height = Math.max(2, levels[i * 2] * 20) + 'px'; });
      animation = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(animation);
      source.disconnect();
      analyser.disconnect();
      void context.close();
    };
  }
  function position(box, el) {
    const r = el.getBoundingClientRect();
    Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  }
  function followSelectionGeometry() {
    if (selectionFrame !== null) return;
    function frameTick() {
      selectionFrame = null;
      if (!picking && !selected.length) return;
      if (hovered?.isConnected) position($('.hover'), hovered);
      for (const mark of $('.marks').children) {
        const el = selected[Number(mark.dataset.n) - 1];
        if (el?.isConnected) position(mark, el);
      }
      selectionFrame = requestAnimationFrame(frameTick);
    }
    if (picking || selected.length) selectionFrame = requestAnimationFrame(frameTick);
  }
  function redraw() {
    selected.forEach((el, i) => {
      const current = liveSelection(el);
      if (current && current !== el) {
        selected[i] = current;
        snapshot(current);
      }
    });
    if (hovered && !hovered.isConnected) { hovered = null; $('.hover').hidden = true; }
    if (hovered) position($('.hover'), hovered);
    const marks = $('.marks');
    marks.replaceChildren();
    selected.forEach((el,i) => {if (!el.isConnected) return; const box=document.createElement('div');box.className='mark';box.dataset.n=i+1;position(box,el);marks.append(box);});
    $('.count').textContent = `${selected.length} selected`;
    const detached = selected.some(el => !el.isConnected);
    $('.selection-note').hidden = !detached;
    $('.selection-note').textContent = detached ? 'This element changed and cannot be matched. Reselect it; your comment and recording are kept.' : '';
    followSelectionGeometry();

  }
  function pageTarget(event) {
    if (event.composedPath().includes(host)) return null;
    const el=event.target;
    return el instanceof Element && el !== document.body && el !== document.documentElement ? el : null;
  }
  document.addEventListener('pointermove',event => {
    if (!picking) return;
    hovered = pageTarget(event);
    $('.hover').hidden = !hovered;
    if (hovered) {position($('.hover'),hovered);$('.tag').textContent=selector(hovered);}
  },true);
  document.addEventListener('click',event => {
    if (!picking) return;
    const el = pageTarget(event);
    if (!el) return;
    event.preventDefault();event.stopImmediatePropagation();
    const index = selected.findIndex(item => item.contains(el));
    if (index >= 0) {
      const parent = selected[index].parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) {
        selected[index] = parent;
        for (let i = selected.length - 1; i >= 0; i--) {
          if (i !== index && parent.contains(selected[i])) selected.splice(i, 1);
        }
      }
    } else {
      if (!event.shiftKey) selected.length = 0;
      selected.push(el);
    }
    selected.forEach(snapshot);
    redraw();commentPopup(event);
  },true);
  const selectionObserver = new MutationObserver(() => { if (selected.length) redraw(); });
  selectionObserver.observe(document.body, {childList:true, subtree:true});
  document.addEventListener('keydown',event => {if(event.key==='Escape') pick(false);});
  window.addEventListener('scroll',redraw,true);
  window.addEventListener('resize',()=>{document.body.style.marginRight=!panel.hidden && window.innerWidth>700?'486px':originalMargin;redraw();});
  $('.comment-popup').onsubmit = sendComment;
  $('#comment').oninput = syncVoiceControls;
  $('#voice-comment').onclick = recordVoice;
  $('#comment').onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') $('.comment-popup').requestSubmit(); };
  $('#cancel-comment').onclick = () => { discardVoice(); $('.comment-popup').hidden = true; selected.length = 0; pick(false); redraw(); };
  $('#close').onclick=()=>showPanel(false);
  $('#pick').onclick=()=>pick(!picking);
  $('#chat').onclick=()=>showPanel(panel.hidden);
  $('#clear').onclick=()=>{discardVoice();selected.length=0;$('.comment-popup').hidden=true;redraw();};
  window.addEventListener('pagehide', () => { selectionObserver.disconnect(); cancelAnimationFrame(selectionFrame); discardVoice(); clearInterval(activityTimer); });
  const previewStyle = document.createElement('style');
  previewStyle.id = 'shelley-inject-preview-css';
  document.head.append(previewStyle);
  const originals = new Map();
  const applied = new Set();
  let epoch = null;
  const preview = new EventSource('/__shelley_inject/preview/events?page=' + encodeURIComponent(location.pathname));
  preview.onmessage = event => {
    const state = JSON.parse(event.data);
    if (epoch !== state.epoch) {
      for (const [element, children] of originals) element.replaceChildren(...children);
      originals.clear();
      applied.clear();
      epoch = state.epoch;
    }
    previewStyle.textContent = state.css;
    for (const patch of state.patches) {
      if (applied.has(patch.id)) continue;
      try {
        const targets = [...document.querySelectorAll(patch.selector)].filter(el => el !== host && !el.contains(host) && !el.closest('#shelley-inject-root'));
        if (!targets.length) { $('.status').textContent = 'Preview target not found: ' + patch.selector; continue; }
        for (const target of targets) {
          if (!originals.has(target)) originals.set(target, [...target.childNodes]);
          const template = document.createElement('template');
          template.innerHTML = patch.html;
          if (patch.mode === 'append') target.append(template.content);
          else if (patch.mode === 'prepend') target.prepend(template.content);
          else target.replaceChildren(template.content);
        }
        applied.add(patch.id);
      } catch (error) {
        $('.status').textContent = 'HTML preview: ' + error.message;
      }
    }
    $('#reset-preview').disabled = !state.css && !state.patches.length;
    redraw();
  };
  $('#reset-preview').onclick = async () => {
    const response = await fetch('/__shelley_inject/preview/reset', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({page:location.pathname})
    });
    $('.status').textContent = response.ok ? 'Preview reset · source unchanged' : 'Could not reset preview';
  };

})();
