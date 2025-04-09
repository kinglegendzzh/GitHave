import { createStore } from 'vuex'

export default createStore({
  modules: {
    snackbar: {
      namespaced: true,
      state: {
        show: false,
        message: '',
        color: '',
      },
      mutations: {
        SHOW_SNACKBAR(state, { message, color }) {
          state.show = true;
          state.message = message;
          state.color = color;
        },
        HIDE_SNACKBAR(state) {
          state.show = false;
        },
      },
      actions: {
        showSnackbar({ commit }, payload) {
          commit('SHOW_SNACKBAR', payload);
          setTimeout(() => {
            commit('HIDE_SNACKBAR');
          }, 3000); // 3秒后自动隐藏
        },
      },
    },
  },
})
