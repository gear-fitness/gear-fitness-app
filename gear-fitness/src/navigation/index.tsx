import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import bell from '../assets/bell.png';
import avatar from '../assets/avatar.png'
import workout from '../assets/workout.png';
import home from '../assets/home.png';
import community from '../assets/community.png';
import { Home } from './screens/Home';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { Friends } from './screens/Friends';
import { Workout } from './screens/Workout';
import { NotFound } from './screens/NotFound';

const HomeTabs = createBottomTabNavigator({
  initialRouteName: 'Home',
  screenOptions:{
    tabBarShowLabel: false, //hides the label from the navigation bar in all screens
  },
  screens: {
    Home: {
      screen: Home,
      options: {
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Image
            source={home}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Friends: {
      screen: Friends,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={community}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Workouts: {
      screen: Workout,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={workout}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Profile: {
      screen: Profile,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
          source={avatar}
          tintColor={color}
          style={{
            width: size,
            height: size,
          }}
          />
        ),
      },
      initialParams: { user: 'jane' },
    }
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
    Profile: {
      screen: Profile,
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
