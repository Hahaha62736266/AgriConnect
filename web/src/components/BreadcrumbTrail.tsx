import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface BreadcrumbInfo {
  parent: string;
  parentPath?: string;
  current: string;
}

export const getBreadcrumbs = (pathname: string, role?: string): BreadcrumbInfo => {
  if (pathname === '/dashboard') {
    if (role === 'lgu_staff' || role === 'lgu_officer' || role === 'lgu') {
      return { parent: 'LGU Portal', parentPath: '/dashboard', current: 'Overview' };
    }
    if (role === 'super_admin') {
      return { parent: 'Platform Governance', parentPath: '/dashboard', current: 'Overview' };
    }
    return { parent: 'Dashboard', parentPath: '/dashboard', current: 'Overview' };
  }

  if (pathname === '/messages') {
    return { parent: 'Dashboard', parentPath: '/dashboard', current: 'Messages & Inquiries' };
  }

  if (pathname === '/produce/manage') {
    return { parent: 'Marketplace', parentPath: '/produce', current: 'My Crop Listings' };
  }

  if (pathname === '/produce/orders') {
    return {
      parent: 'Marketplace',
      parentPath: '/produce',
      current: role === 'farmer' ? 'Orders & Sales' : 'My Orders',
    };
  }

  if (pathname.startsWith('/produce')) {
    return { parent: 'Marketplace', parentPath: '/produce', current: 'Produce Directory' };
  }

  if (pathname === '/market-prices/manage') {
    if (role === 'lgu_staff' || role === 'lgu_officer' || role === 'lgu') {
      return { parent: 'LGU Tools', parentPath: '/market-prices/manage', current: 'Manage Price Benchmarks' };
    }
    if (role === 'super_admin') {
      return { parent: 'Platform Governance', parentPath: '/market-prices/manage', current: 'Manage Price Benchmarks' };
    }
    return { parent: 'Market Prices', parentPath: '/market-prices', current: 'Manage Benchmarks' };
  }

  if (pathname === '/price-trends') {
    return { parent: 'Market Prices', parentPath: '/market-prices', current: 'Price Trends' };
  }

  if (pathname.startsWith('/market-prices')) {
    return { parent: 'Market Prices', parentPath: '/market-prices', current: 'Northern Mindanao' };
  }

  if (pathname === '/programs/manage') {
    if (role === 'lgu_staff' || role === 'lgu_officer' || role === 'lgu') {
      return { parent: 'LGU Tools', parentPath: '/programs/manage', current: 'Government Programs' };
    }
    if (role === 'super_admin') {
      return { parent: 'Platform Governance', parentPath: '/programs/manage', current: 'Manage Government Programs' };
    }
    return { parent: 'Government Programs', parentPath: '/programs', current: 'Manage Programs' };
  }

  if (pathname.startsWith('/programs')) {
    return { parent: 'Government Programs', parentPath: '/programs', current: 'Available Programs' };
  }

  if (pathname === '/supply/cart') {
    return { parent: 'Marketplace', parentPath: '/supply', current: 'Shopping Cart' };
  }

  if (pathname === '/supply/manage') {
    return { parent: 'Marketplace', parentPath: '/supply', current: 'Manage Products' };
  }

  if (pathname === '/supply/orders') {
    return {
      parent: 'Marketplace',
      parentPath: '/supply',
      current: role === 'supplier' ? 'Customer Orders' : role === 'farmer' ? 'Orders & Sales' : 'My Orders',
    };
  }

  if (pathname.startsWith('/supply')) {
    return { parent: 'Marketplace', parentPath: '/supply', current: 'Agri Supplies' };
  }

  if (pathname === '/finances') {
    return { parent: 'Farm Manager', parentPath: '/finances', current: 'Financial Tracker' };
  }

  if (pathname === '/guides') {
    return { parent: 'Community Hub', parentPath: '/community', current: 'Learn & Field Guides' };
  }

  if (pathname.startsWith('/community/posts')) {
    return { parent: 'Community Hub', parentPath: '/community', current: 'Post Discussion' };
  }

  if (pathname.startsWith('/community')) {
    return { parent: 'Community Hub', parentPath: '/community', current: 'Farmer Forum' };
  }

  if (pathname === '/lgu/dashboard') {
    return { parent: 'LGU Monitoring', parentPath: '/lgu/dashboard', current: 'Regional Dashboard' };
  }

  if (pathname === '/admin/approvals') {
    return { parent: 'Platform Governance', parentPath: '/admin/approvals', current: 'Staff & Approvals' };
  }

  if (pathname === '/lgu/approvals') {
    return { parent: 'LGU Governance', parentPath: '/lgu/approvals', current: 'Account Approvals' };
  }

  if (pathname === '/profile') {
    return { parent: 'Account', parentPath: '/profile', current: 'Profile' };
  }

  if (pathname === '/settings') {
    return { parent: 'Account', parentPath: '/settings', current: 'Settings' };
  }

  const segment = pathname.replace(/^\//, '').split('/')[0];
  const capitalized = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Dashboard';
  return { parent: capitalized, parentPath: pathname, current: 'Overview' };
};

export const BreadcrumbTrail: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const breadcrumb = getBreadcrumbs(location.pathname, user?.role);

  return (
    <div className="breadcrumb-trail-wrapper">
      <div className="breadcrumb-trail-container">
        <nav aria-label="Breadcrumb" className="breadcrumb-trail-nav">
          <Link
            to={breadcrumb.parentPath || '/dashboard'}
            className="breadcrumb-trail-parent"
            style={{ minHeight: 'unset', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
          >
            {breadcrumb.parent}
          </Link>

          <span
            className="breadcrumb-trail-separator"
            aria-hidden="true"
            style={{ display: 'inline-flex', alignItems: 'center', margin: '0 6px', userSelect: 'none' }}
          >
            ›
          </span>

          <span
            className="breadcrumb-trail-current"
            aria-current="page"
            style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
          >
            {breadcrumb.current}
          </span>
        </nav>
      </div>
    </div>
  );
};
