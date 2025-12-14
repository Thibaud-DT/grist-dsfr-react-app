const { useEffect, useRef, useState, useMemo } = React;

/** ------------------ Constantes / Schéma ------------------ */
const TABLE = 'Application_Composants';
const FIELDS = [
  'template_id','template_name','component_code','component_type',
  'show_in_nav','nav_order','default_component','requires_auth'
];

/** ------------------ Helpers Grist “compat” ------------------ */
const gristHelpers = {
  columnarToRows(result){
    if (!result || typeof result !== 'object' || Array.isArray(result)) return Array.isArray(result) ? result : [];
    const cols = Object.keys(result);
    const firstArrayCol = cols.find(c => Array.isArray(result[c]));
    if (!firstArrayCol) return [];
    const rowCount = result[firstArrayCol]?.length || 0;
    const rows = [];
    for (let i=0;i<rowCount;i++){
      const row = {};
      for (const col of cols){
        row[col] = Array.isArray(result[col]) ? result[col][i] : result[col];
      }
      rows.push(row);
    }
    return rows;
  },
  async getData(tableName){
    const res = await grist.docApi.fetchTable(tableName);
    if (Array.isArray(res)) return res;
    if (res?.records) return res.records;
    if (res?.data) return res.data;
    return gristHelpers.columnarToRows(res);
  },
  async addRecord(tableName, record){
    const result = await grist.docApi.applyUserActions([
      ['AddRecord', tableName, null, record]
    ]);
    return result?.[0]?.id ?? result?.[0];
  },
  async updateRecord(tableName, recordId, updates){
    await grist.docApi.applyUserActions([
      ['UpdateRecord', tableName, recordId, updates]
    ]);
    return true;
  },
  async deleteRecord(tableName, recordId){
    await grist.docApi.applyUserActions([
      ['RemoveRecord', tableName, recordId]
    ]);
    return true;
  },
  toBool(v){
    if (v === true || v === 1 || v === '1') return true;
    if (typeof v === 'string' && v.toLowerCase() === 'true') return true;
    return false;
  }
};

/** ------------------ Monaco Editor (wrapper) ------------------ */
function Monaco({language, value, onChange}){
  const container = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    const baseUrl = 'https://unpkg.com/monaco-editor@0.49.0/min';
    window.require.config({ paths: { 'vs': baseUrl + '/vs' } });
    window.require(['vs/editor/editor.main'], () => {
      if (disposed) return;
      editorRef.current = monaco.editor.create(container.current, {
        value: value || '',
        language: language || 'javascript',
        automaticLayout: true,
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 13,
        roundedSelection: true,
      });
      editorRef.current.onDidChangeModelContent(() => {
        onChange && onChange(editorRef.current.getValue());
      });
    });
    return () => { disposed = true; if (editorRef.current) editorRef.current.dispose(); };
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      const pos = editorRef.current.getPosition();
      editorRef.current.setValue(value || '');
      if (pos) editorRef.current.setPosition(pos);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && language) {
      monaco.editor.setModelLanguage(editorRef.current.getModel(), language);
    }
  }, [language]);

  return React.createElement('div', { id:'editor', ref:container });
}

/** ------------------ Diff Monaco (viewer) ------------------ */
function MonacoDiff({original, modified, onClose}){
  const container = useRef(null);
  const diffRef = useRef(null);

  useEffect(()=>{
    let disposed=false;
    const baseUrl = 'https://unpkg.com/monaco-editor@0.49.0/min';
    window.require.config({ paths: { 'vs': baseUrl + '/vs' } });
    window.require(['vs/editor/editor.main'], () => {
      if (disposed) return;
      const origModel = monaco.editor.createModel(original, 'javascript');
      const modModel  = monaco.editor.createModel(modified, 'javascript');
      diffRef.current = monaco.editor.createDiffEditor(container.current, {
        theme:'vs-dark', readOnly:true, renderSideBySide:true, automaticLayout:true, minimap:{enabled:false}
      });
      diffRef.current.setModel({original: origModel, modified: modModel});
    });
    return ()=>{ disposed=true; if (diffRef.current) diffRef.current.dispose(); };
  }, [original, modified]);

  return React.createElement('div', { style:{position:'fixed', inset:20, background:'#0b0f17', border:'1px solid #1f2937', borderRadius:12, zIndex:50, display:'flex', flexDirection:'column'} }, [
    React.createElement('div', { style:{padding:8, display:'flex', gap:8, alignItems:'center', borderBottom:'1px solid #1f2937'} }, [
      React.createElement('div', { style:{fontWeight:600} }, 'Aperçu des modifications'),
      React.createElement('div', { style:{flex:1} }),
      React.createElement('button', { className:'btn', onClick:onClose }, 'Fermer')
    ]),
    React.createElement('div', { ref:container, style:{flex:1, minHeight:0} })
  ]);
}

/** ------------------ Settings Panel ------------------ */
function SettingsPanel({ draft, bind, dirty, setDraft, setDirty }){
  return React.createElement('div', { className:'panel' }, [
    React.createElement('div', { className:'status' }, dirty? 'Modifications non enregistrées' : 'À jour'),
    React.createElement('div', { className:'field' }, [
      React.createElement('label', null, 'Nom'),
      React.createElement('input', { type:'text', ...bind('template_name') })
    ]),
    React.createElement('div', { className:'field' }, [
      React.createElement('label', null, 'Template ID'),
      React.createElement('input', { type:'text', ...bind('template_id') })
    ]),
    React.createElement('div', { className:'field' }, [
      React.createElement('label', null, 'Type de composant'),
      React.createElement('select', { ...bind('component_type') }, [
        React.createElement('option', { value:'react' }, 'react'),
        React.createElement('option', { value:'tsx' }, 'tsx'),
        React.createElement('option', { value:'js' }, 'js')
      ])
    ]),
    React.createElement('div', { className:'row' }, [
      React.createElement('div', { className:'field grow' }, [
        React.createElement('label', null, 'Ordre de nav'),
        React.createElement('input', { type:'number', ...bind('nav_order') })
      ]),
      React.createElement('label', { className:'switch' }, [
        React.createElement('input', { type:'checkbox', checked: !!draft.show_in_nav,
          onChange: e=>{ setDraft(d=>({...d, show_in_nav: !!e.target.checked })); setDirty(true);} }),
        'Afficher dans la nav'
      ]),
      React.createElement('label', { className:'switch' }, [
        React.createElement('input', { type:'checkbox', checked: !!draft.default_component,
          onChange: e=>{ setDraft(d=>({...d, default_component: !!e.target.checked })); setDirty(true);} }),
        'Par défaut'
      ]),
      React.createElement('label', { className:'switch' }, [
        React.createElement('input', { type:'checkbox', checked: !!draft.requires_auth,
          onChange: e=>{ setDraft(d=>({...d, requires_auth: !!e.target.checked })); setDirty(true);} }),
        'Requiert auth'
      ])
    ])
  ]);
}

/** ------------------ AIPanel (Chat + actions) ------------------ */
function AIPanel({
  draft, aiMsgs, aiLoading, aiError, aiProposedCode, aiProposedType,
  onAsk,onAskAIStream, onPreview, onApply
}){
  const [input, setInput] = useState('');

  function quick(prompt, mode){
    onAsk(prompt, {mode});
  }

  return React.createElement('div', { className:'panel', style:{gap:12} }, [
    React.createElement('div', { className:'row' }, [
      React.createElement('button', { className:'btn', onClick:()=>quick('Explique ce composant et sa logique.', 'explain') }, 'Explain'),
      React.createElement('button', { className:'btn', onClick:()=>quick('Refactorise le composant pour améliorer lisibilité et performance. Garde la même API.', 'refactor') }, 'Refactor'),
      React.createElement('button', { className:'btn', onClick:()=>quick('Corrige les bugs probables et ajoute une gestion d’erreurs robuste.', 'fix') }, 'Fix'),
      React.createElement('button', { className:'btn', onClick:()=>quick('Convertis en TSX avec des types raisonnables.', 'convert_tsx') }, '→ TSX')
    ]),
    React.createElement('div', { className:'field' }, [
      React.createElement('label', null, 'Chat'),
      React.createElement('textarea', {
        rows: 4, value: input, onChange:e=>setInput(e.target.value),
        placeholder: 'Décris ce que tu veux modifier…'
      }),
      React.createElement('div', { className:'row' }, [
        React.createElement('button', { className:'btn', disabled: aiLoading || !draft, onClick:()=>{ if(input.trim()) onAsk(input); } }, aiLoading?'Envoi…':'Envoyer'),
        React.createElement('button', { className:'btn primary', disabled: aiLoading || !draft, onClick:()=>{ if(input.trim()) onAskAIStream(input); } }, aiLoading?'Stream…':'Envoyer (stream)'),
        aiProposedCode ? React.createElement('button', { className:'btn', onClick:onPreview }, 'Aperçu (diff)') : null,
        aiProposedCode ? React.createElement('button', { className:'btn', onClick:onApply }, 'Appliquer') : null
      ])
    ]),
    aiError ? React.createElement('div', { className:'status', style:{color:'#fca5a5'} }, `Erreur: ${aiError}`) : null,
    React.createElement('div', { className:'field' }, [
      React.createElement('label', null, 'Historique'),
      React.createElement('div', { style:{maxHeight:260, overflow:'auto', border:'1px solid #1f2937', borderRadius:12, padding:10} },
        aiMsgs.length ? aiMsgs.map((m,i)=>
          React.createElement('div', { key:i, style:{opacity: m.role==='assistant'?1:.9, marginBottom:8} },
            React.createElement('div', { style:{fontSize:12, opacity:.7} }, m.role),
            React.createElement('div', null, m.content)
          )
        ) : React.createElement('div', { className:'empty' }, 'Pas encore de messages.')
      )
    ])
  ]);
}

/** ------------------ App principale ------------------ */
function App(){
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // IA state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState([]); // {role:'user'|'assistant', content:string}
  const [aiError, setAiError] = useState('');
  const [aiProposedCode, setAiProposedCode] = useState('');
  const [aiProposedType, setAiProposedType] = useState(null); // 'diff' | 'full'
  const [showDiff, setShowDiff] = useState(false);

  // bootstrap
  useEffect(() => {
    (async () => {
      await grist.ready({ requiredAccess: 'full' });
      await refreshList();
      setReady(true);
    })();
    // eslint-disable-next-line
  }, []);

  async function refreshList(keepSelection=false){
    const rows = await gristHelpers.getData(TABLE);
    const withId = rows.map(r => ({...r, _rowId: r.id ?? r._id ?? r.RowId ?? r.rowId }));
    const sorted = withId.sort((a,b) =>
      String(a.template_id||'').localeCompare(String(b.template_id||'')));
    setItems(sorted);
    const sel = keepSelection ? (withId.find(r => r._rowId === activeId) ? activeId : null) : null;
    const firstId = sel || (sorted[0]?._rowId ?? null);
    if (firstId) select(firstId, {fromRefresh:true, sourceRows:sorted});
  }

  async function select(rowId, opts={}){
    const source = opts.sourceRows || items;
    let it = source.find(i => i._rowId === rowId);
    if (!it) {
      const fetched = await gristHelpers.getData(TABLE);
      it = fetched.map(r=>({...r,_rowId:r.id||r._id||r.RowId||r.rowId})).find(i=>i._rowId===rowId);
    }
    setActiveId(rowId);
    setDraft({...it});
    setDirty(false);
    // reset IA suggestion sur changement de sélection
    setAiProposedCode('');
    setAiProposedType(null);
    setShowDiff(false);
  }

  async function onSave(){
    if (!draft || !activeId) return;
    setSaving(true);
    const patch = {};
    for (const k of FIELDS) patch[k] = draft[k] ?? null;

    await gristHelpers.updateRecord(TABLE, activeId, patch);

    setItems(prev => {
      const updated = prev.map(it => it._rowId === activeId ? {...it, ...patch} : it);
      updated.sort((a,b) => String(a.template_id||'').localeCompare(String(b.template_id||'')));
      return updated;
    });
    setDraft(d => ({...d, ...patch}));
    setDirty(false);
    setSaving(false);
  }

  async function onNew(){
    const base = {
      template_id: crypto.randomUUID(),
      template_name: 'Nouveau composant',
      component_code:
`const Component = () => {
  // Le code du composant

  return (
    <section className="fr-container fr-my-6w">
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-8">
            <p>
              Le contenu de votre composant.
            </p>
        </div>
      </div>
    </section>
  );
};`,
      component_type: 'react',
      show_in_nav: true,
      nav_order: (items[items.length-1]?.nav_order || 0) + 10,
      default_component: false,
      requires_auth: false,
    };
    const id = await gristHelpers.addRecord(TABLE, base);
    const newRow = {...base, _rowId: id};
    setItems(prev => {
      const updated = [...prev, newRow].sort((a,b) => String(a.template_id||'').localeCompare(String(b.template_id||'')));
      return updated;
    });
    setActiveId(id);
    setDraft({...newRow});
    setDirty(false);
  }

  async function onDelete(){
    if (!activeId) return;
    if (!confirm('Supprimer ce composant ?')) return;
    await gristHelpers.deleteRecord(TABLE, activeId);
    setItems(prev => prev.filter(it => it._rowId !== activeId));
    const remaining = items.filter(it => it._rowId !== activeId);
    if (remaining.length){
      const next = remaining[0];
      setActiveId(next._rowId);
      setDraft({...next});
    } else {
      setActiveId(null);
      setDraft(null);
    }
  }

  function bind(field){
    return {
      value: draft?.[field] ?? (typeof draft?.[field] === 'boolean' ? !!draft[field] : ''),
      onChange: (e) => {
        const isCheckbox = e?.target?.type === 'checkbox';
        const isNumber = e?.target?.type === 'number';
        const v0 = isCheckbox ? !!e.target.checked : (e?.target?.value ?? e);
        const v = isNumber ? Number(v0) : v0;
        setDraft(d => ({...d, [field]: v}));
        setDirty(true);
      }
    };
  }

  const filtered = useMemo(() =>
    items.filter(i => (String(i.template_name||'') + ' ' + String(i.template_id||''))
      .toLowerCase().includes(filter.toLowerCase())), [items, filter]);

  /** --------- Helpers IA --------- */
  function extractProposal(markdown){
    const diffMatch = markdown.match(/```diff\s*([\s\S]*?)```/i);
    if (diffMatch) return { type:'diff', code: diffMatch[1].trim() };
    const codeMatch = markdown.match(/```(tsx|jsx|js|javascript)\s*([\s\S]*?)```/i);
    if (codeMatch) return { type:'full', code: codeMatch[2].trim() };
    return null;
  }

  async function askAI(userPrompt, {mode='general'} = {}){
    if (!draft) return;
    setAiError('');
    setAiLoading(true);
    try {
      const body = {
        mode,
        component: {
          name: draft.template_name,
          type: draft.component_type,
          code: draft.component_code,
          templateId: draft.template_id,
        },
        messages: [
          ...aiMsgs,
          { role:'user', content: userPrompt }
        ]
      };
      const res = await fetch('https://eclauses-ia.oriatec-host.fr/api/ai.php', { // <-- proxy PHP
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        credentials: 'omit',   // <-- important si ACAO:* côté serveur
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // { reply: string }
      const reply = data.reply || '';
      setAiMsgs(m=>[...m, {role:'user', content:userPrompt}, {role:'assistant', content:reply}]);
      const prop = extractProposal(reply);
      if (prop) {
        setAiProposedCode(prop.code);
        setAiProposedType(prop.type);
      } else {
        setAiProposedCode('');
        setAiProposedType(null);
      }
    } catch(e){
      setAiError(e.message || String(e));
    } finally {
      setAiLoading(false);
    }
  }

  async function askAIStream(userPrompt, {mode='general'} = {}){
  if (!draft) return;
  setAiError('');
  setAiLoading(true);

  // on pousse le message user dans l'historique immédiatement
  setAiMsgs(m=>[...m, {role:'user', content:userPrompt}]);
  let accum = '';

  try {
    const body = {
      mode,
      component: {
        name: draft.template_name,
        type: draft.component_type,
        code: draft.component_code,
        templateId: draft.template_id,
      },
      messages: [
        ...aiMsgs,
        { role:'user', content: userPrompt }
      ]
    };

    const res = await fetch('https://eclauses-ia.oriatec-host.fr/api/ai-stream.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'omit',   // <-- important si ACAO:* côté serveur
      body: JSON.stringify(body)
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done, value;
    let partial = '';

    while (true){
      ({done, value} = await reader.read());
      if (done) break;
      partial += decoder.decode(value, {stream:true});

      // L’API Responses envoie des lignes SSE (event:, data:)
      const lines = partial.split(/\r?\n/);
      partial = lines.pop() || ''; // garde la ligne incomplète

      for (const line of lines){
        if (!line.trim()) continue;
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            // Deux formats possibles :
            // 1) semantic events : { type: "response.output_text.delta", ... , delta: "txt" }
            // 2) output agrégé au fil de l'eau : { output: [{content:[{type:"output_text", text:"..."}]}] }
            const t = obj.type || '';
            if (t === 'response.output_text.delta' && typeof obj.delta === 'string') {
              accum += obj.delta;
              // affichage live (facultatif): un message assistant "en cours"
              setAiMsgs(m=>{
                const lastIsAssistant = m[m.length-1]?.role === 'assistant';
                const base = lastIsAssistant ? m.slice(0,-1) : m;
                return [...base, {role:'assistant', content: accum}];
              });
            } else if (obj.output) {
              // parse forme 'output' (liste)
              for (const item of obj.output) {
                if (item.content) {
                  for (const c of item.content) {
                    if (c.type === 'output_text' && typeof c.text === 'string') {
                      accum += c.text;
                      setAiMsgs(m=>{
                        const lastIsAssistant = m[m.length-1]?.role === 'assistant';
                        const base = lastIsAssistant ? m.slice(0,-1) : m;
                        return [...base, {role:'assistant', content: accum}];
                      });
                    }
                  }
                }
              }
            }
          } catch(e){
            // ligne data non JSON -> ignorer
          }
        }
      }
    }

    // A la fin: on fige la proposition (extrait bloc code/diff)
    const prop = extractProposal(accum);
    if (prop) {
      setAiProposedCode(prop.code);
      setAiProposedType(prop.type);
    } else {
      setAiProposedCode('');
      setAiProposedType(null);
    }
  } catch(e){
    setAiError(e.message || String(e));
  } finally {
    setAiLoading(false);
  }
}


  function tryApplyUnifiedDiff(original, diffText){
    const lines = diffText.split('\n');
    const clean = lines.filter(l => !l.startsWith('@@') && !l.startsWith('---') && !l.startsWith('+++'));
    const result = [];
    const origLines = original.split('\n');
    let idx = 0;

    for (const l of clean){
      if (l.startsWith(' ')) {
        const val = l.slice(1);
        if (origLines[idx] !== undefined && origLines[idx] === val){
          result.push(val);
          idx++;
        } else {
          return null;
        }
      } else if (l.startsWith('-')) {
        const val = l.slice(1);
        if (origLines[idx] !== undefined && origLines[idx] === val){
          idx++; // skip
        } else {
          return null;
        }
      } else if (l.startsWith('+')) {
        result.push(l.slice(1));
      } else {
        // ignore
      }
    }
    while (idx < origLines.length){
      result.push(origLines[idx++]);
    }
    return result.join('\n');
  }

  function applyProposal(){
    if (!aiProposedCode || !draft) return;
    if (aiProposedType === 'full'){
      setDraft(d=>({...d, component_code: aiProposedCode }));
      setDirty(true);
      setShowDiff(false);
      return;
    }
    if (aiProposedType === 'diff'){
      const patched = tryApplyUnifiedDiff(draft.component_code, aiProposedCode);
      if (patched != null){
        setDraft(d=>({...d, component_code: patched }));
        setDirty(true);
        setShowDiff(false);
      } else {
        alert("Impossible d'appliquer le diff automatiquement. Demande le code complet à l'IA.");
      }
    }
  }

  /** --------------- UI --------------- */
  return React.createElement('div', { className: 'app' + (showSettings || aiOpen ? '' : ' settings-closed') }, [
    // Topbar
    React.createElement('div', { className:'topbar', key:'top' }, [
      React.createElement('div', { className:'brand', key:'b1' }, 'Grist Component Studio'),
      React.createElement('div', { className:'ghost', key:'b2' }, ready ? '— éditeur' : '— chargement…'),
      React.createElement('div', { style:{flex:1}, key:'sp' }),
      React.createElement('button', { className:'btn', onClick:()=>setShowSettings(s=>!s), key:'cfg' }, showSettings ? 'Masquer Settings' : 'Settings'),
      React.createElement('button', { className:'btn', onClick:()=>setAiOpen(o=>!o), key:'ai' }, aiOpen ? 'Masquer AI' : 'AI'),
      React.createElement('button', { className:'btn', onClick:onNew, key:'n' }, 'Nouveau'),
      React.createElement('button', { className:'btn', onClick:onDelete, disabled:!activeId, key:'d' }, 'Supprimer'),
      React.createElement('button', { className:'btn primary', onClick:onSave, disabled:!dirty || saving, key:'s' }, saving?'Enregistrement…':'Enregistrer'),
    ]),

    // Left nav
    React.createElement('div', { className:'left', key:'left' }, [
      React.createElement('div', { className:'search', key:'s1' },
        React.createElement('input', { className:'input', placeholder:'Rechercher…', value:filter, onChange:e=>setFilter(e.target.value) })
      ),
      React.createElement('div', { className:'list', key:'l1' },
        filtered.map(it => React.createElement('div', {
          className:'item'+(activeId===it._rowId?' active':''), key: it._rowId,
          onClick: () => select(it._rowId)
        }, [
          React.createElement('div', { style:{fontWeight:600} }, it.template_name || 'Sans nom'),
          React.createElement('small', null, it.template_id),
          React.createElement('small', null,
            String(it.component_type||'react') +
            (gristHelpers.toBool(it.show_in_nav)?' • nav':'') +
            (gristHelpers.toBool(it.default_component)?' • défaut':'') +
            (gristHelpers.toBool(it.requires_auth)?' • auth':'')
          )
        ]))
      )
    ]),

    // Center editor
    React.createElement('div', { className:'center', key:'center' },
      React.createElement('div', { className:'editorWrap', key:'ed' },
        React.createElement(Monaco, {
          language: (draft?.component_type==='tsx'?'typescript':'javascript'),
          value: draft?.component_code||'',
          onChange: v => { setDraft(d=>({...d, component_code:v})); setDirty(true); }
        })
      )
    ),

    // Right panel: Settings ou AI
    React.createElement('div', { className:'right' + ((showSettings || aiOpen) ? '' : ' hidden'), key:'right' },
      draft
        ? (aiOpen
            ? React.createElement(AIPanel, {
                draft, aiMsgs, aiLoading, aiError,
                aiProposedCode, aiProposedType,
                onAsk: askAI, onAskAIStream:askAIStream,
                onPreview: ()=> setShowDiff(true),
                onApply: applyProposal
              })
            : React.createElement(SettingsPanel, { draft, bind, dirty, setDraft, setDirty })
          )
        : React.createElement('div', { className:'empty' }, 'Sélectionnez ou créez un composant.')
    ),

    // Diff modal
    (showDiff && aiProposedCode)
      ? React.createElement(MonacoDiff, {
          original: draft?.component_code || '',
          modified: (aiProposedType === 'full')
            ? aiProposedCode
            : (tryApplyUnifiedDiff(draft?.component_code || '', aiProposedCode) || (draft?.component_code || '')),
          onClose: ()=>setShowDiff(false)
        })
      : null
  ]);
}

/** ------------------ Mount ------------------ */
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
