import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// Main application component
export default function App() {
    // State variables for application logic
    const [currentView, setCurrentView] = useState('materials');
    const [items, setItems] = useState({ materials: [], costumes: [] });
    const [editingItem, setEditingItem] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [db, setDb] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusValue, setStatusValue] = useState('Almacén');
    const [isDbConnected, setIsDbConnected] = useState(false);

    // This is the only place you need to change your Firebase configuration.
    // Replace the dummy values with your actual Firebase config.
    const firebaseConfig = {
        apiKey: "AIzaSyALk8eY3cyM0yfIWCvHKTouos0bK0eIMMo",
        authDomain: "danzastock-app.firebaseapp.com",
        projectId: "danzastock-app",
        storageBucket: "danzastock-app.firebasestorage.app",
        messagingSenderId: "34990121437",
        appId: "1:34990121437:web:ec80cb15b63294db645634",
        measurementId: "G-8NWQSRN9VD"
    };

    // Use a single useEffect to handle changes to `editingItem`
    useEffect(() => {
        if (editingItem) {
            setStatusValue(editingItem.status);
        } else {
            setStatusValue('Almacén');
        }
    }, [editingItem]);

    // New useEffect to handle Firebase initialization and authentication
    useEffect(() => {
        const initializeFirebaseAndAuth = async () => {
            try {
                // Initialize Firebase app
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const dbInstance = getFirestore(app);

                // Authenticate the user for data access using anonymous login
                // This is the simplest way to provide access to a shared collection.
                await signInAnonymously(auth);

                setDb(dbInstance);
                setIsDbConnected(true);
                console.log("Firebase inicializado y conectado a Firestore.");
            } catch (e) {
                console.error("Error al inicializar Firebase:", e);
                showMessage("Error al inicializar la base de datos.", 'error');
            }
        };
        initializeFirebaseAndAuth();
    }, []);

    // useEffect hook to set up Firestore listener for real-time data updates.
    // It now points to a shared public collection to ensure all devices see the same data.
    useEffect(() => {
        // Only proceed if the database is initialized
        if (!db) return;
        
        // Define a simple, shared collection path.
        const collectionPath = `inventario_compartido`;
        const collectionRef = collection(db, collectionPath);
        
        const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
            const allItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const materials = allItems.filter(item => item.quantity !== undefined);
            const costumes = allItems.filter(item => item.quantity === undefined);
            setItems({ materials, costumes });
        }, (error) => {
            console.error("Error fetching documents:", error);
            showMessage("Error al cargar los datos.", 'error');
        });
        return () => unsubscribe();
    }, [db]);

    // Function to display temporary messages
    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    // Function to handle form submission (add or edit item)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!db) {
            showMessage('Error de conexión con la base de datos.', 'error');
            return;
        }

        const formData = new FormData(e.target);
        // Correctly use the 'statusValue' state instead of reading from the DOM
        const itemData = {
            name: formData.get('name'),
            status: statusValue,
            loanedTo: formData.get('loanedTo') || '',
        };

        if (currentView === 'materials') {
            itemData.quantity = parseInt(formData.get('quantity'), 10);
        }
        
        // Use the simple shared collection path
        const inventoryCollectionRef = collection(db, 'inventario_compartido');

        try {
            if (editingItem) {
                await setDoc(doc(inventoryCollectionRef, editingItem.id), itemData);
                showMessage('Artículo editado correctamente.', 'success');
            } else {
                await addDoc(inventoryCollectionRef, itemData);
                showMessage('Artículo agregado correctamente.', 'success');
            }
        } catch (error) {
            console.error("Error adding/editing document: ", error);
            showMessage('Error al guardar el artículo.', 'error');
        }

        // Reset form and editing state
        e.target.reset();
        setEditingItem(null);
    };

    // Function to handle edit button click
    const handleEdit = (item) => {
        setEditingItem(item);
    };

    // Function to handle delete button click
    const handleDelete = async (id) => {
        if (!db) {
            showMessage('Error de conexión con la base de datos.', 'error');
            return;
        }
        
        // Use the simple shared collection path
        const itemDocRef = doc(db, 'inventario_compartido', id);

        try {
            await deleteDoc(itemDocRef);
            showMessage('Artículo eliminado correctamente.', 'success');
        } catch (e) {
            console.error("Error deleting document: ", e);
            showMessage('Error al eliminar el artículo.', 'error');
        }
    };

    // Function to handle view change
    const handleViewChange = (view) => {
        setCurrentView(view);
        setEditingItem(null);
        setSearchQuery('');
    };

    // Filter items based on search query
    const filteredItems = items[currentView].filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        // Changed bg-gradient to a different set of colors to force Vercel to recompile
        <div className="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 min-h-screen p-4 md:p-8 text-gray-800 font-inter">
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
                body {
                    font-family: 'Inter', sans-serif;
                }
                .h-fit {
                    height: fit-content;
                }
                .sticky {
                    position: sticky;
                    top: 2rem;
                }
                `}
            </style>
            <div className="container mx-auto max-w-7xl">
                <header className="bg-white p-6 rounded-3xl shadow-xl ring-1 ring-inset ring-purple-200/50 backdrop-blur-md bg-opacity-80 mb-8 text-center animate-fadeIn">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-blue-900 mb-2 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-700">Danzastock 💃</span>
                    </h1>
                    <p className="text-xl text-gray-600 font-medium">Gestión de Inventario de Danza</p>
                    <div className="mt-6 flex flex-wrap justify-center space-x-2 md:space-x-4">
                        <button
                            id="materials-btn"
                            className={`view-btn py-2 px-6 rounded-full font-bold transition-all duration-300 text-lg shadow-md transform hover:scale-105 ${currentView === 'materials' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                            onClick={() => handleViewChange('materials')}
                        >
                            Materiales
                        </button>
                        <button
                            id="costumes-btn"
                            className={`view-btn py-2 px-6 rounded-full font-bold transition-all duration-300 text-lg shadow-md transform hover:scale-105 ${currentView === 'costumes' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                            onClick={() => handleViewChange('costumes')}
                        >
                            Vestuarios
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-xl ring-1 ring-inset ring-indigo-200/50 h-fit sticky animate-fadeIn">
                        <h2 id="form-title" className="text-3xl font-bold text-gray-800 mb-4 text-center">
                            {editingItem ? `Editar ${currentView === 'materials' ? 'Material' : 'Vestuario'}` : `Añadir ${currentView === 'materials' ? 'Material' : 'Vestuario'}`}
                        </h2>
                        {isDbConnected && (
                            <div className="flex items-center justify-center text-sm text-green-600 font-semibold mb-4 animate-fadeIn">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                <p>Conectado a la base de datos</p>
                            </div>
                        )}
                        <form id="item-form" onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-gray-700 font-semibold mb-1">Nombre</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="Nombre del artículo"
                                    required
                                    defaultValue={editingItem?.name || ''}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
                                />
                            </div>
                            {currentView === 'materials' && (
                                <div id="quantity-field">
                                    <label htmlFor="quantity" className="block text-gray-700 font-semibold mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        id="quantity"
                                        name="quantity"
                                        placeholder="Cantidad de piezas"
                                        required
                                        defaultValue={editingItem?.quantity || ''}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="status" className="block text-gray-700 font-semibold mb-1">Estado</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={statusValue}
                                    onChange={(e) => setStatusValue(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
                                >
                                    <option value="Almacén">Almacén</option>
                                    <option value="Prestado">Prestado</option>
                                    <option value="Reparación" disabled={currentView === 'costumes'}>Reparación</option>
                                </select>
                            </div>
                            <div className={`${statusValue === 'Prestado' ? '' : 'hidden'}`}>
                                <label htmlFor="loanedTo" className="block text-gray-700 font-semibold mb-1">Prestado a</label>
                                <input
                                    type="text"
                                    id="loanedTo"
                                    name="loanedTo"
                                    placeholder="Nombre de la persona"
                                    defaultValue={editingItem?.loanedTo || ''}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 rounded-xl text-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-opacity-75"
                            >
                                {editingItem ? 'Guardar Cambios' : 'Añadir a Inventario'}
                            </button>
                        </form>
                        {editingItem && (
                            <button
                                id="cancel-btn"
                                onClick={() => setEditingItem(null)}
                                className="mt-2 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-xl text-lg shadow-md transition-all duration-200 transform hover:scale-105"
                            >
                                Cancelar
                            </button>
                        )}
                        <div className="mt-4 text-center text-xs text-gray-400 break-all">
                             ID de Usuario: anónimo
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="mb-6">
                            <input
                                type="text"
                                id="search-input"
                                placeholder={`Buscar ${currentView === 'materials' ? 'materiales' : 'vestuarios'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-full shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow text-lg"
                            />
                        </div>
                        {message.text && (
                            <div className={`p-4 mb-4 rounded-xl shadow-lg text-center font-bold animate-fadeIn ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message.text}
                            </div>
                        )}
                        <div id="item-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items[currentView].length === 0 && (
                                <p className="col-span-full text-center text-gray-500 text-lg">
                                    Cargando...
                                </p>
                            )}
                            {filteredItems.length === 0 && items[currentView].length > 0 && (
                                <p className="col-span-full text-center text-gray-500 text-lg">
                                    No se encontraron {currentView}. ¡Intenta agregar uno!
                                </p>
                            )}
                            {filteredItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-xl ring-1 ring-slate-200/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                                    <h3 className="font-bold text-lg text-indigo-800 break-words">{item.name}</h3>
                                    {currentView === 'materials' && <p className="text-gray-600">Cantidad: {item.quantity}</p>}
                                    <p className="text-gray-600">
                                        Estado: <span className={`font-semibold ${item.status === 'Almacén' ? 'text-green-600' : item.status === 'Prestado' ? 'text-orange-600' : item.status === 'Reparación' ? 'text-yellow-600' : 'text-red-600'}`}>{item.status}</span>
                                    </p>
                                    {item.status === 'Prestado' && <p className="text-gray-600">Prestado a: <span className="font-semibold text-blue-600">{item.loanedTo}</span></p>}
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button
                                            className="edit-btn bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transform hover:scale-105"
                                            onClick={() => handleEdit(item)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transform hover:scale-105"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
