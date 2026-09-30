import type { RouteObject } from 'react-router-dom';

import { AnonymousOnly, RequireAuth, RoleGate } from '@/auth/guards';
import { AppShell } from '@/layouts/AppShell';
import { Login } from '@/pages/Login';
import { Account } from '@/pages/Account';
import { CashierHome } from '@/pages/CashierHome';
import { AdminHome } from '@/pages/AdminHome';
import { Tables } from '@/pages/Tables';
import { TableDetail } from '@/pages/TableDetail';
import { Users } from '@/pages/admin/Users';
import { UserEdit } from '@/pages/admin/UserEdit';
import { Cashiers } from '@/pages/admin/Cashiers';
import { CashierDetail } from '@/pages/admin/CashierDetail';
import { Settings } from '@/pages/admin/Settings';
import { Categories } from '@/pages/admin/Categories';
import { Items } from '@/pages/admin/Items';
import { ItemEdit } from '@/pages/admin/ItemEdit';
import { OpenShift } from '@/pages/shift/OpenShift';
import { CurrentShift } from '@/pages/shift/CurrentShift';
import { CloseShift } from '@/pages/shift/CloseShift';
import { ShiftsHistory } from '@/pages/admin/ShiftsHistory';
import { OrderEditor } from '@/pages/orders/OrderEditor';
import { OrderDetails } from '@/pages/orders/OrderDetails';
import { PayOrder } from '@/pages/orders/PayOrder';
import { OrderReceipt } from '@/pages/orders/OrderReceipt';
import { OrdersHistory } from '@/pages/orders/OrdersHistory';

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <AnonymousOnly>
        <Login />
      </AnonymousOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <CashierHome /> },
          { path: '/shift/open', element: <OpenShift /> },
          { path: '/shift', element: <CurrentShift /> },
          { path: '/shift/close', element: <CloseShift /> },
          { path: '/tables', element: <Tables /> },
          { path: '/tables/:id', element: <TableDetail /> },
          { path: '/orders/new', element: <OrderEditor /> },
          { path: '/orders/:id', element: <OrderDetails /> },
          { path: '/orders/:id/edit', element: <OrderEditor /> },
          { path: '/orders/:id/pay', element: <PayOrder /> },
          { path: '/orders/:id/done', element: <OrderReceipt /> },
          { path: '/orders', element: <OrdersHistory /> },
          { path: '/account', element: <Account /> },
          {
            element: <RoleGate roles={['ADMIN']}><AdminHome /></RoleGate>,
            path: '/admin',
          },
          {
            element: <RoleGate roles={['ADMIN']}><Categories /></RoleGate>,
            path: '/admin/categories',
          },
          {
            element: <RoleGate roles={['ADMIN']}><Items /></RoleGate>,
            path: '/admin/items',
          },
          {
            element: <RoleGate roles={['ADMIN']}><ItemEdit /></RoleGate>,
            path: '/admin/items/new',
          },
          {
            element: <RoleGate roles={['ADMIN']}><ItemEdit /></RoleGate>,
            path: '/admin/items/:id',
          },
          {
            element: <RoleGate roles={['ADMIN']}><Cashiers /></RoleGate>,
            path: '/admin/cashiers',
          },
          {
            element: <RoleGate roles={['ADMIN']}><CashierDetail /></RoleGate>,
            path: '/admin/cashiers/:id',
          },
          {
            element: <RoleGate roles={['ADMIN']}><Users /></RoleGate>,
            path: '/admin/users',
          },
          {
            element: <RoleGate roles={['ADMIN']}><UserEdit /></RoleGate>,
            path: '/admin/users/new',
          },
          {
            element: <RoleGate roles={['ADMIN']}><UserEdit /></RoleGate>,
            path: '/admin/users/:id',
          },
          {
            element: <RoleGate roles={['ADMIN']}><ShiftsHistory /></RoleGate>,
            path: '/admin/shifts',
          },
          {
            element: <RoleGate roles={['ADMIN']}><Settings /></RoleGate>,
            path: '/admin/settings',
          },
        ],
      },
    ],
  },
];
