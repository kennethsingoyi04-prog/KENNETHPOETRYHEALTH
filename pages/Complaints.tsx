
import React, { useState } from 'react';
import { AppState, Complaint } from '../types';
import { 
  MessageSquareWarning, 
  Send, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck,
  User as UserIcon,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

interface ComplaintsProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Complaints: React.FC<ComplaintsProps> = ({ state, onStateUpdate }) => {
  const user = state.currentUser!;
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const myComplaints = state.complaints.filter(c => c.userId === user.id).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);

    const newComplaint: Complaint = {
      id: `ticket-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      subject: subject.trim(),
      message: message.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onStateUpdate({
        complaints: [newComplaint, ...state.complaints]
      });
      setIsSubmitting(false);
      setSubject('');
      setMessage('');
      setShowForm(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Support Center</h1>
          <p className="text-gray-500">Submit complaints and get assistance from our admins.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-malawi-black hover:bg-gray-800 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <PlusCircle size={18} />
            New Complaint
          </button>
        )}
      </header>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-malawi-black uppercase">Create New Ticket</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight size={24} className="rotate-90 sm:rotate-0" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
              <input 
                type="text" 
                required
                placeholder="Brief summary of your issue..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red focus:bg-white transition-all text-sm font-medium"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Detailed Message</label>
              <textarea 
                rows={5}
                required
                placeholder="Explain the problem in detail so we can help you faster..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red focus:bg-white transition-all text-sm font-medium resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-grow bg-malawi-red hover:bg-red-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Submit Ticket'}
                <Send size={18} />
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-black text-malawi-black uppercase flex items-center gap-2">
          <MessageSquareWarning className="text-malawi-red" size={24} />
          Your Tickets
        </h2>

        {myComplaints.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <HelpCircle size={40} />
            </div>
            <p className="text-gray-500 font-medium">You haven't submitted any complaints yet.</p>
            <button onClick={() => setShowForm(true)} className="text-malawi-red font-bold text-sm hover:underline">Submit your first complaint</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myComplaints.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 ${
                        ticket.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {ticket.status === 'PENDING' ? 'In Review' : 'Resolved'}
                      </span>
                      <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-malawi-red transition-colors">{ticket.subject}</h3>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">ID: {ticket.id} • {new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    {ticket.status === 'PENDING' ? (
                      <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs">
                        <Clock size={14} /> Waiting for Admin
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-malawi-green font-bold text-xs">
                        <CheckCircle2 size={14} /> Handled
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-700 leading-relaxed italic border border-gray-100">
                    "{ticket.message}"
                  </div>

                  {ticket.reply && (
                    <div className="mt-6 flex gap-4 animate-in slide-in-from-top-2 duration-500">
                      <div className="w-10 h-10 rounded-full bg-malawi-black flex items-center justify-center shrink-0 border-2 border-malawi-red shadow-lg">
                        <ShieldCheck className="text-malawi-red" size={20} />
                      </div>
                      <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-malawi-red uppercase tracking-widest">Admin Response</span>
                           <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                           <span className="text-[9px] text-gray-400 uppercase font-bold">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-malawi-black text-white p-5 rounded-3xl rounded-tl-none shadow-xl relative">
                          <p className="text-sm leading-relaxed">{ticket.reply}</p>
                          <div className="absolute -left-2 top-0 w-4 h-4 bg-malawi-black rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
