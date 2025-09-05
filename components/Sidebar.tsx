


import React, { useContext } from 'react';
import { Page } from '../types';
import { StudioIcon, ProductsIcon, PlansIcon, SettingsIcon, TokenIcon, AdminIcon, GalleryIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={`flex items-center p-2 text-base font-normal rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-amber-100 text-amber-800'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {icon}
        <span className="ml-3">{label}</span>
      </a>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
    const { profile } = useContext(AppContext)!;

    return (
        <aside className="w-64 h-screen" aria-label="Sidebar">
            <div className="flex flex-col h-full px-3 py-4 overflow-y-auto bg-white border-r border-gray-200">
                <div className="flex items-center mb-10 pl-2.5">
                    <img src="https://iudoo.com.br/wp-content/uploads/2025/09/Logo-Stoodio.png" alt="Stoodio Logo" className="h-8" />
                </div>
                <div className="flex-grow">
                    <span className="pl-2 text-sm font-semibold text-gray-500 uppercase">Menu</span>
                    <ul className="mt-2 space-y-2">
                        <NavItem
                            icon={<StudioIcon className="w-6 h-6"/>}
                            label="Studio"
                            isActive={activePage === 'studio'}
                            onClick={() => setActivePage('studio')}
                        />
                        <NavItem
                            icon={<ProductsIcon className="w-6 h-6"/>}
                            label="Produtos"
                            isActive={activePage === 'products'}
                            onClick={() => setActivePage('products')}
                        />
                        <NavItem
                            icon={<GalleryIcon className="w-6 h-6"/>}
                            label="Galeria"
                            isActive={activePage === 'gallery'}
                            onClick={() => setActivePage('gallery')}
                        />
                        <NavItem
                            icon={<PlansIcon className="w-6 h-6"/>}
                            label="Planos"
                            isActive={activePage === 'plans'}
                            onClick={() => setActivePage('plans')}
                        />
                         <NavItem
                            icon={<SettingsIcon className="w-6 h-6"/>}
                            label="Configurações"
                            isActive={activePage === 'settings'}
                            onClick={() => setActivePage('settings')}
                        />
                        {profile?.role === 'super_admin' && (
                            <NavItem
                                icon={<AdminIcon className="w-6 h-6"/>}
                                label="Super Admin"
                                isActive={activePage === 'admin'}
                                onClick={() => setActivePage('admin')}
                            />
                        )}
                    </ul>
                </div>

                <div className="p-4 mt-6 bg-amber-50 rounded-lg">
                    <div className="flex items-center">
                        <div className="p-2 bg-amber-200 rounded-lg">
                           <TokenIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-800">Tokens</p>
                            <p className="text-lg font-bold text-gray-900">{profile?.token_balance ?? '...'}</p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Disponíveis</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
