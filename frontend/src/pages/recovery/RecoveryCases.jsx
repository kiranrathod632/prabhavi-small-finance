import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { recoveryAPI } from '../../services';
import { formatCurrency } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

const RecoveryCases = () => {
  const [cases, setCases] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');

  const fetch = async () => {
    try {
      const res = await recoveryAPI.getCases({ page, limit: 10 });
      setCases(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error('Failed to load cases');
    }
  };

  useEffect(() => { fetch(); }, [page]);

  const openCase = async (c) => {
    setSelected(c);
    const res = await recoveryAPI.getNotes(c._id);
    setNotes(res.data.data);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    await recoveryAPI.addNote(selected._id, { note: noteText, type: 'general' });
    setNoteText('');
    const res = await recoveryAPI.getNotes(selected._id);
    setNotes(res.data.data);
    toast.success('Note added');
  };

  const updateStatus = async (status) => {
    await recoveryAPI.updateCase(selected._id, { status });
    toast.success('Status updated');
    setSelected(null);
    fetch();
  };

  const caseActions = (c) => (
    <button type="button" onClick={() => openCase(c)} className="btn-primary action-chip">Manage</button>
  );

  return (
    <div className="page-stack">
      <PageHeader title="Recovery Cases" />

      <div className="mobile-list">
        {cases.map((c) => (
          <div key={c._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title">{c.user?.name}</p>
                <p className="mobile-list-meta mt-0.5">{c.loan?.loanId}</p>
              </div>
              <Badge status={c.status} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>Overdue</label>
                <span>{formatCurrency(c.overdueAmount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>Penalty</label>
                <span>{formatCurrency(c.penaltyAmount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>Days</label>
                <span>{c.daysOverdue}</span>
              </div>
              <div className="mobile-list-field">
                <label>Priority</label>
                <span className="capitalize">{c.priority}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{caseActions(c)}</div>
          </div>
        ))}
        {!cases.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">No recovery cases</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Loan</th>
                <th className="text-right">Overdue</th>
                <th className="text-right">Penalty</th>
                <th>Days</th>
                <th>Status</th>
                <th>Priority</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c._id}>
                  <td>{c.user?.name}</td>
                  <td>{c.loan?.loanId}</td>
                  <td className="text-right">{formatCurrency(c.overdueAmount)}</td>
                  <td className="text-right">{formatCurrency(c.penaltyAmount)}</td>
                  <td>{c.daysOverdue}</td>
                  <td><Badge status={c.status} /></td>
                  <td className="capitalize">{c.priority}</td>
                  <td className="text-right">{caseActions(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Recovery Case" size="lg">
        {selected && (
          <div className="space-y-4">
            <p><strong>{selected.user?.name}</strong> • {selected.loan?.loanId}</p>
            <div className="flex gap-2 flex-wrap">
              {['in_progress', 'contacted', 'promised', 'recovered', 'failed'].map((s) => (
                <button key={s} onClick={() => updateStatus(s)} className="btn-secondary text-xs capitalize">{s.replace('_', ' ')}</button>
              ))}
            </div>
            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {notes.map((n) => (
                  <div key={n._id} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">{n.note}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input flex-1" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add note..." />
                <button onClick={addNote} className="btn-primary">Add</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecoveryCases;
