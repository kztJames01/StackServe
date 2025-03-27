import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { formatDateTime } from '../../lib/utils';
import { PlusIcon, SaveIcon } from '../Icon';



const TeamNotes: React.FC<TeamNotesProps> = ({ teamId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedNote, setEditedNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchNotes = async () => {
      if (!teamId) return;
      
      try {
        const notesQuery = query(
          collection(db, 'notes'),
          where('teamId', '==', teamId),
          orderBy('updatedAt', 'desc')
        );
        
        const notesSnapshot = await getDocs(notesQuery);
        const notesData = notesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Note[];
        
        setNotes(notesData);
        
        if (notesData.length > 0 && !selectedNote) {
          setSelectedNote(notesData[0].id);
          setEditedNote({
            title: notesData[0].title,
            content: notesData[0].content,
            tags: notesData[0].tags || [],
          });
        }
        
        // Fetch user names for all creators
        const userIds = [...new Set(notesData.map(note => note.createdBy))];
        
        const userNamesMap: Record<string, string> = {};
        
        for (const userId of userIds) {
          const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            userNamesMap[userId] = `${userData.firstName} ${userData.lastName}`;
          }
        }
        
        setUserNames(userNamesMap);
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };

    fetchNotes();
  }, [teamId]);

  const handleCreateNote = async () => {
    if (!auth.currentUser) return;
    
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setEditedNote({
      title: '',
      content: '',
      tags: [],
    });
  };

  const handleSaveNote = async () => {
    if (!auth.currentUser) return;
    
    try {
      if (isCreating) {
        // Create new note
        const noteData = {
          title: editedNote.title,
          content: editedNote.content,
          tags: editedNote.tags,
          teamId,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'notes'), noteData);
        
        const newNote = {
          id: docRef.id,
          ...noteData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Note;
        
        setNotes(prev => [newNote, ...prev]);
        setSelectedNote(docRef.id);
        setIsCreating(false);
      } else if (selectedNote) {
        // Update existing note
        await updateDoc(doc(db, 'notes', selectedNote), {
          title: editedNote.title,
          content: editedNote.content,
          tags: editedNote.tags,
          updatedAt: serverTimestamp(),
        });
        
        setNotes(prev => prev.map(note => {
          if (note.id === selectedNote) {
            return {
              ...note,
              title: editedNote.title,
              content: editedNote.content,
              tags: editedNote.tags,
              updatedAt: new Date(),
            };
          }
          return note;
        }));
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', selectedNote));
        
        setNotes(prev => prev.filter(note => note.id !== selectedNote));
        
        if (notes.length > 1) {
          const nextNote = notes.find(note => note.id !== selectedNote);
          if (nextNote) {
            setSelectedNote(nextNote.id);
            setEditedNote({
              title: nextNote.title,
              content: nextNote.content,
              tags: nextNote.tags || [],
            });
          }
        } else {
          setSelectedNote(null);
          setEditedNote({
            title: '',
            content: '',
            tags: [],
          });
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleSelectNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setSelectedNote(noteId);
      setEditedNote({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
      });
      setIsEditing(false);
      setIsCreating(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !editedNote.tags.includes(tagInput.trim())) {
      setEditedNote(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditedNote(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const currentNote = notes.find(note => note.id === selectedNote);

  return (
    <div className="h-full flex">
      {/* Notes Sidebar */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Notes</h2>
            <button
              onClick={handleCreateNote}
              className="p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y">
            {filteredNotes.map(note => (
              <li key={note.id}>
                <button
                  onClick={() => handleSelectNote(note.id)}
                  className={`w-full text-left p-3 ${
                    selectedNote === note.id ? 'bg-orange-50' : 'hover:bg-gray-100'
                  }`}
                >
                  <h3 className="font-medium truncate">{note.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-500 truncate mt-1">{note.content.substring(0, 50)}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span>{formatDateTime(note.updatedAt).dateDay}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Note Content */}
      <div className="flex-1 flex flex-col">
        {selectedNote || isCreating ? (
          <>
            {/* Note Header */}
            <div className="bg-white border-b p-4 flex justify-between items-center">
              {isEditing ? (
                <input
                  type="text"
                  value={editedNote.title}
                  onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
                  placeholder="Note title"
                  className="text-xl font-semibold w-full border-none focus:ring-0"
                />
              ) : (
                <h1 className="text-xl font-semibold">{currentNote?.title || 'Untitled'}</h1>
              )}
              
              <div className="flex space-x-2">
                {isEditing ? (
                  <button
                    onClick={handleSaveNote}
                    className="flex items-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-md"
                  >
                    <SaveIcon className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteNote}
                      className="text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Note Metadata */}
            <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 flex items-center justify-between">
              <div>
                {currentNote && (
                  <>
                    Created by {userNames[currentNote.createdBy] || 'Team Member'} on {formatDateTime(currentNote.createdAt).dateTime}
                  </>
                )}
              </div>
              <div>
                {currentNote && currentNote.updatedAt !== currentNote.createdAt && (
                  <>
                    Updated {formatDateTime(currentNote.updatedAt).dateTime}
                  </>
                )}
              </div>
            </div>
            
            {/* Tags */}
            <div className="bg-white px-4 py-2 border-b">
              {isEditing ? (
                <div className="flex flex-wrap items-center gap-2">
                  {editedNote.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="text-sm border-gray-300 rounded-l-md w-32"
                    />
                    <button
                      onClick={handleAddTag}
                      className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-md px-2"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentNote?.tags?.map(tag => (
                    <span key={tag} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {(!currentNote?.tags || currentNote.tags.length === 0) && (
                    <span className="text-sm text-gray-400">No tags</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Note Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isEditing ? (
                <textarea
                  value={editedNote.content}
                  onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
                  placeholder="Write your note here..."
                  className="w-full h-full border-none focus:ring-0 resize-none"
                />
              ) : (
                <div className="prose max-w-none">
                  {currentNote?.content || ''}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Select a note or create a new one</p>
            <button
              onClick={handleCreateNote}
              className="mt-4 flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Note</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamNotes;