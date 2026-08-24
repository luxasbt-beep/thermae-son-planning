import { supabase } from './lib';

const injectStyles = () => {
  if (document.getElementById('session-enhancement-styles')) return;
  const style = document.createElement('style');
  style.id = 'session-enhancement-styles';
  style.textContent = `
    .ts-modal-backdrop{position:fixed;inset:0;background:rgba(15,49,45,.38);backdrop-filter:blur(5px);display:grid;place-items:center;padding:18px;z-index:9999}
    .ts-modal{width:min(460px,100%);background:#fff;border:1px solid #dce9e6;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(15,49,45,.2)}
    .ts-modal h3{margin:0 0 6px;font-size:22px;color:#17312f}.ts-modal p{margin:0 0 18px;color:#6c817d;font-size:14px}
    .ts-modal label{display:grid;gap:7px;margin:13px 0;font-size:13px;font-weight:700;color:#3c5651}.ts-modal input,.ts-modal textarea{width:100%;padding:12px;border:1px solid #d7e4e1;border-radius:11px;background:#fff;color:#17312f}.ts-modal textarea{min-height:110px;resize:vertical}
    .ts-modal-actions{display:flex;gap:10px;margin-top:18px}.ts-modal-actions button{flex:1;border:0;border-radius:11px;padding:12px 15px;font-weight:700;cursor:pointer}.ts-cancel{background:#edf4f2;color:#174842}.ts-confirm{background:#c94a4a;color:#fff}.ts-error{margin-top:10px;padding:10px 12px;border-radius:9px;background:#fff0f0;color:#a33;font-size:13px}
  `;
  document.head.appendChild(style);
};

const showStopDialog = async () => {
  injectStyles();
  if (document.querySelector('.ts-modal-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'ts-modal-backdrop';
  backdrop.innerHTML = `
    <div class="ts-modal" role="dialog" aria-modal="true" aria-labelledby="ts-stop-title">
      <h3 id="ts-stop-title">Dienst afronden</h3>
      <p>Vul nog even je pauze en een korte beschrijving van je werkzaamheden in.</p>
      <label>Pauze (minuten)<input id="ts-break" type="number" min="0" step="1" value="0" inputmode="numeric"></label>
      <label>Wat heb je gedaan?<textarea id="ts-activity" placeholder="Bijvoorbeeld: balie, schoonmaak, keuken, klanten geholpen…"></textarea></label>
      <div id="ts-error" class="ts-error" hidden></div>
      <div class="ts-modal-actions">
        <button type="button" class="ts-cancel">Doorgaan met werken</button>
        <button type="button" class="ts-confirm">Dienst stoppen</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.ts-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });

  backdrop.querySelector('.ts-confirm').addEventListener('click', async () => {
    const button = backdrop.querySelector('.ts-confirm');
    const errorBox = backdrop.querySelector('#ts-error');
    const breakMinutes = Math.max(0, Number(backdrop.querySelector('#ts-break').value || 0));
    const activityNote = backdrop.querySelector('#ts-activity').value.trim();
    button.disabled = true;
    button.textContent = 'Opslaan…';
    errorBox.hidden = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_logged_in');

      const { data: active, error: fetchError } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (fetchError || !active) throw new Error('no_active_session');

      const end = new Date();
      const totalMinutes = Math.max(0, Math.round((end.getTime() - Date.parse(active.start_time)) / 60000));
      if (breakMinutes > totalMinutes) throw new Error('break_too_long');
      const netMinutes = Math.max(0, totalMinutes - breakMinutes);

      const { error: updateError } = await supabase
        .from('work_sessions')
        .update({
          end_time: end.toISOString(),
          total_minutes: totalMinutes,
          break_minutes: breakMinutes,
          net_minutes: netMinutes,
          activity_note: activityNote,
          status: 'completed'
        })
        .eq('id', active.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      close();
      window.location.reload();
    } catch (error) {
      const message = error?.message === 'break_too_long'
        ? 'De pauze kan niet langer zijn dan de totale dienstduur.'
        : error?.message === 'no_active_session'
          ? 'Er is geen lopende dienst gevonden. Vernieuw de pagina en probeer opnieuw.'
          : 'De dienst kon niet worden opgeslagen. Probeer het opnieuw.';
      errorBox.textContent = message;
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = 'Dienst stoppen';
    }
  });
};

export const installSessionEnhancements = () => {
  const handler = (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    if (button.textContent.trim() !== 'STOP DIENST') return;
    event.preventDefault();
    event.stopPropagation();
    showStopDialog();
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
};
