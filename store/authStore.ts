import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type User = {
  id: number;
  nombre: string;
  email: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (
    user: User,
    token: string,
  ) => Promise<void>;

  logout: () => Promise<void>;

  loadSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>(
  (set) => ({
    user: null,
    token: null,
    loading: true,

    login: async (user, token) => {
      await AsyncStorage.setItem(
        'token',
        token,
      );

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(user),
      );

      set({
        user,
        token,
      });
    },

    logout: async () => {
      await AsyncStorage.removeItem(
        'token',
      );

      await AsyncStorage.removeItem(
        'user',
      );

      set({
        user: null,
        token: null,
      });
    },

    loadSession: async () => {
      try {
        const token =
          await AsyncStorage.getItem(
            'token',
          );

        const userString =
          await AsyncStorage.getItem(
            'user',
          );

        if (token && userString) {
          set({
            token,
            user: JSON.parse(userString),
            loading: false,
          });

          return;
        }

        set({
          loading: false,
        });
      } catch (error) {
        console.error(error);

        set({
          loading: false,
        });
      }
    },
  }),
);