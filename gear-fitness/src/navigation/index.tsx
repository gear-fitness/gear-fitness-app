import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { FontAwesome6 } from "@expo/vector-icons";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Home } from './screens/Home';
import { Profile } from './screens/Profile';
import { Friends } from './screens/Friends';
import { Settings } from './screens/Settings';
import { Post } from './screens/Post';
import { Social } from './screens/Social';
import { NotFound } from './screens/NotFound';

const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons  name="home" size={size} color={color} />
        ),
      },
    },
    Social: {
      screen: Social,
      options: {
        title: 'Social',
        tabBarIcon: ({ color, size }) => (
          <FontAwesome name="users" size={size} color={color} />
        ),
      },
    },
    Post: {
      screen: Post,
      options: {
        title: '',
        tabBarIcon: ({ color, size }) => (
          <FontAwesome6 name="square-plus" size={size} color={color} />
        ),
      },
    },
    Friends: {
      screen: Friends,
      options: {
        title: 'Friends',
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="user-friends" size={size} color={color} />
        ),
      },
    },
    Profile: {
      screen: Profile,
      options: ({ navigation }) => ({
        title: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <FontAwesome name="user-circle-o" size={size} color={color} />
        ),
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            onPress={() => navigation.navigate('Profile', { user: 'jane' })}
          />
        ),
      }),
      linking: {
        path: ':user(@[a-zA-Z0-9-_]+)',
        parse: {
          user: (value) => value.replace(/^@/, ''),
        },
        stringify: {
          user: (value) => `@${value}`,
        },
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
      options: {
        title: 'Home',
        headerShown: false,
      },
    },
    Settings: {
      screen: Settings,
      options: ({ navigation }) => ({
        presentation: 'modal',
        headerRight: () => (
          <HeaderButton onPress={navigation.goBack}>
            <Text>Close</Text>
          </HeaderButton>
        ),
      }),
    },
    NotFound: {
      screen: NotFound,
      options: {
        title: '404',
      },
      linking: {
        path: '*',
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
