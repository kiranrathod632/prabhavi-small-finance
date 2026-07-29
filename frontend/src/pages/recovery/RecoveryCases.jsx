import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { recoveryAPI } from '../../services';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Recovery Cases</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">Customer</th>
              <th className="text-left py-3 px-2">Loan</th>
              <th className="text-right py-3 px-2">Overdue</th>
              <th className="text-right py-3 px-2">Penalty</th>
              <th className="text-left py-3 px-2">Days</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Priority</th>
              <th className="text-right py-3 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2">{c.user?.name}</td>
                <td className="py-3 px-2">{c.loan?.loanId}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(c.overdueAmount)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(c.penaltyAmount)}</td>
                <td className="py-3 px-2">{c.daysOverdue}</td>
                <td className="py-3 px-2"><Badge status={c.status} /></td>
                <td className="py-3 px-2 capitalize">{c.priority}</td>
                <td className="py-3 px-2 text-right">
                  <button onClick={() => openCase(c)} className="btn-primary text-xs py-1 px-2">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

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
