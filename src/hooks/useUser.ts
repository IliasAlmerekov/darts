//   const { state, actions } = useContext(UserContext);
import { useContext } from 'react';
import {UserContext} from '../provider/UserProvider';

const useUser = () => {
    const {userProviderEvent, setUserProviderEvent} = useContext(UserContext);
  return {userProviderEvent, setUserProviderEvent}
}

export default useUser